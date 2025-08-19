import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  UpdateCommand, 
  QueryCommand,
  DeleteCommand 
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { 
  Contract, 
  ContractStatus, 
  ContractSignature, 
  ContractMilestone, 
  ContractVariation, 
  ContractPayment,
  ContractAuditEntry,
  ContractAuditAction
} from '../types';
import { logger } from '../utils/logger';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-west-2' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'uk-home-improvement-platform';

export class ContractModel {
  /**
   * Create a new contract
   */
  static async create(contractData: Omit<Contract, 'PK' | 'SK' | 'id' | 'createdAt' | 'updatedAt' | 'GSI7PK' | 'GSI7SK' | 'GSI8PK' | 'GSI8SK'>): Promise<Contract> {
    const contractId = uuidv4();
    const now = new Date().toISOString();
    
    const contract: Contract = {
      ...contractData,
      PK: `CONTRACT#${contractId}`,
      SK: 'METADATA',
      id: contractId,
      createdAt: now,
      updatedAt: now,
      GSI7PK: contractData.homeownerId, // For homeowner's contracts lookup
      GSI7SK: `${contractData.status}#${now}`,
      GSI8PK: contractData.builderId, // For builder's contracts lookup
      GSI8SK: `${contractData.status}#${now}`
    };

    try {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: contract,
        ConditionExpression: 'attribute_not_exists(PK)'
      }));

      // Create audit entry
      await this.createAuditEntry(contractId, 'created', 'system', {
        contractNumber: contract.contractNumber,
        projectId: contract.projectId,
        totalValue: contract.terms.totalValue
      });

      logger.info(`Contract created successfully: ${contractId}`);
      return contract;
    } catch (error) {
      logger.error('Error creating contract:', error);
      throw new Error('Failed to create contract');
    }
  }

  /**
   * Get contract by ID
   */
  static async getById(contractId: string): Promise<Contract | null> {
    try {
      const result = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `CONTRACT#${contractId}`,
          SK: 'METADATA'
        }
      }));

      return result.Item as Contract || null;
    } catch (error) {
      logger.error(`Error getting contract ${contractId}:`, error);
      throw new Error('Failed to get contract');
    }
  }

  /**
   * Update contract
   */
  static async update(contractId: string, updates: Partial<Contract>, updatedBy: string): Promise<Contract> {
    const now = new Date().toISOString();
    
    try {
      // Get current contract for audit trail
      const currentContract = await this.getById(contractId);
      if (!currentContract) {
        throw new Error('Contract not found');
      }

      const updateExpression = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Build update expression dynamically
      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'PK' && key !== 'SK' && key !== 'id' && key !== 'createdAt') {
          updateExpression.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
        }
      });

      // Always update the updatedAt timestamp
      updateExpression.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = now;

      // Update GSI sort keys if status changed
      if (updates.status) {
        updateExpression.push('#GSI7SK = :GSI7SK', '#GSI8SK = :GSI8SK');
        expressionAttributeNames['#GSI7SK'] = 'GSI7SK';
        expressionAttributeNames['#GSI8SK'] = 'GSI8SK';
        expressionAttributeValues[':GSI7SK'] = `${updates.status}#${now}`;
        expressionAttributeValues[':GSI8SK'] = `${updates.status}#${now}`;
      }

      const result = await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `CONTRACT#${contractId}`,
          SK: 'METADATA'
        },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      }));

      const updatedContract = result.Attributes as Contract;

      // Create audit entry for significant changes
      if (updates.status && updates.status !== currentContract.status) {
        await this.createAuditEntry(contractId, 'status-changed', updatedBy, {
          previousStatus: currentContract.status,
          newStatus: updates.status
        });
      }

      logger.info(`Contract updated successfully: ${contractId}`);
      return updatedContract;
    } catch (error) {
      logger.error(`Error updating contract ${contractId}:`, error);
      throw new Error('Failed to update contract');
    }
  }

  /**
   * Get contracts by homeowner ID
   */
  static async getByHomeownerId(homeownerId: string, status?: ContractStatus): Promise<Contract[]> {
    try {
      const keyConditionExpression = status 
        ? 'GSI7PK = :homeownerId AND begins_with(GSI7SK, :status)'
        : 'GSI7PK = :homeownerId';

      const expressionAttributeValues: Record<string, any> = {
        ':homeownerId': homeownerId
      };

      if (status) {
        expressionAttributeValues[':status'] = status;
      }

      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI7',
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ScanIndexForward: false // Most recent first
      }));

      return result.Items as Contract[] || [];
    } catch (error) {
      logger.error(`Error getting contracts for homeowner ${homeownerId}:`, error);
      throw new Error('Failed to get homeowner contracts');
    }
  }

  /**
   * Get contracts by builder ID
   */
  static async getByBuilderId(builderId: string, status?: ContractStatus): Promise<Contract[]> {
    try {
      const keyConditionExpression = status 
        ? 'GSI8PK = :builderId AND begins_with(GSI8SK, :status)'
        : 'GSI8PK = :builderId';

      const expressionAttributeValues: Record<string, any> = {
        ':builderId': builderId
      };

      if (status) {
        expressionAttributeValues[':status'] = status;
      }

      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI8',
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ScanIndexForward: false // Most recent first
      }));

      return result.Items as Contract[] || [];
    } catch (error) {
      logger.error(`Error getting contracts for builder ${builderId}:`, error);
      throw new Error('Failed to get builder contracts');
    }
  }

  /**
   * Get contract by project ID
   */
  static async getByProjectId(projectId: string): Promise<Contract | null> {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'projectId = :projectId',
        ExpressionAttributeValues: {
          ':projectId': projectId
        }
      }));

      const contracts = result.Items as Contract[] || [];
      return contracts.length > 0 ? contracts[0] : null;
    } catch (error) {
      logger.error(`Error getting contract for project ${projectId}:`, error);
      throw new Error('Failed to get contract by project ID');
    }
  }

  /**
   * Add signature to contract
   */
  static async addSignature(contractId: string, signature: ContractSignature, updatedBy: string): Promise<Contract> {
    try {
      const contract = await this.getById(contractId);
      if (!contract) {
        throw new Error('Contract not found');
      }

      const updatedSignatures = [...contract.signatures, signature];
      const allSigned = updatedSignatures.every(sig => sig.status === 'signed');
      
      let newStatus = contract.status;
      if (allSigned && contract.status === 'pending-signatures') {
        newStatus = 'fully-signed';
      } else if (updatedSignatures.some(sig => sig.status === 'signed') && contract.status === 'pending-signatures') {
        newStatus = 'partially-signed';
      }

      const updates: Partial<Contract> = {
        signatures: updatedSignatures,
        status: newStatus
      };

      if (allSigned && !contract.signedAt) {
        updates.signedAt = new Date().toISOString();
      }

      const updatedContract = await this.update(contractId, updates, updatedBy);

      // Create audit entry
      await this.createAuditEntry(contractId, 'signed', updatedBy, {
        signerName: signature.signerName,
        signerRole: signature.party,
        allSigned
      });

      return updatedContract;
    } catch (error) {
      logger.error(`Error adding signature to contract ${contractId}:`, error);
      throw new Error('Failed to add signature');
    }
  }

  /**
   * Update milestone status
   */
  static async updateMilestone(contractId: string, milestoneId: string, updates: Partial<ContractMilestone>, updatedBy: string): Promise<Contract> {
    try {
      const contract = await this.getById(contractId);
      if (!contract) {
        throw new Error('Contract not found');
      }

      const updatedMilestones = contract.milestones.map(milestone => 
        milestone.id === milestoneId 
          ? { ...milestone, ...updates }
          : milestone
      );

      const updatedContract = await this.update(contractId, { milestones: updatedMilestones }, updatedBy);

      // Create audit entry
      await this.createAuditEntry(contractId, 'milestone-completed', updatedBy, {
        milestoneId,
        milestoneName: updates.name || 'Unknown',
        status: updates.status
      });

      return updatedContract;
    } catch (error) {
      logger.error(`Error updating milestone ${milestoneId} for contract ${contractId}:`, error);
      throw new Error('Failed to update milestone');
    }
  }

  /**
   * Add variation to contract
   */
  static async addVariation(contractId: string, variation: ContractVariation, updatedBy: string): Promise<Contract> {
    try {
      const contract = await this.getById(contractId);
      if (!contract) {
        throw new Error('Contract not found');
      }

      const updatedVariations = [...contract.variations, variation];
      const updatedContract = await this.update(contractId, { variations: updatedVariations }, updatedBy);

      // Create audit entry
      await this.createAuditEntry(contractId, 'variation-added', updatedBy, {
        variationId: variation.id,
        variationNumber: variation.variationNumber,
        costImpact: variation.costImpact,
        timeImpact: variation.timeImpact
      });

      return updatedContract;
    } catch (error) {
      logger.error(`Error adding variation to contract ${contractId}:`, error);
      throw new Error('Failed to add variation');
    }
  }

  /**
   * Record payment
   */
  static async recordPayment(contractId: string, payment: ContractPayment, updatedBy: string): Promise<Contract> {
    try {
      const contract = await this.getById(contractId);
      if (!contract) {
        throw new Error('Contract not found');
      }

      const updatedPayments = [...contract.payments, payment];
      const updatedContract = await this.update(contractId, { payments: updatedPayments }, updatedBy);

      // Create audit entry
      await this.createAuditEntry(contractId, 'payment-made', updatedBy, {
        paymentId: payment.id,
        amount: payment.amount,
        milestoneId: payment.milestoneId
      });

      return updatedContract;
    } catch (error) {
      logger.error(`Error recording payment for contract ${contractId}:`, error);
      throw new Error('Failed to record payment');
    }
  }

  /**
   * Terminate contract
   */
  static async terminate(contractId: string, reason: string, terminatedBy: string): Promise<Contract> {
    try {
      const updates: Partial<Contract> = {
        status: 'terminated',
        terminatedAt: new Date().toISOString()
      };

      const updatedContract = await this.update(contractId, updates, terminatedBy);

      // Create audit entry
      await this.createAuditEntry(contractId, 'terminated', terminatedBy, {
        reason,
        terminatedAt: updates.terminatedAt
      });

      return updatedContract;
    } catch (error) {
      logger.error(`Error terminating contract ${contractId}:`, error);
      throw new Error('Failed to terminate contract');
    }
  }

  /**
   * Delete contract (soft delete by updating status)
   */
  static async delete(contractId: string, deletedBy: string): Promise<boolean> {
    try {
      await this.update(contractId, { status: 'cancelled' }, deletedBy);
      logger.info(`Contract soft deleted: ${contractId}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting contract ${contractId}:`, error);
      throw new Error('Failed to delete contract');
    }
  }

  /**
   * Get contract audit trail
   */
  static async getAuditTrail(contractId: string): Promise<ContractAuditEntry[]> {
    try {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `CONTRACT#${contractId}`,
          ':sk': 'AUDIT#'
        },
        ScanIndexForward: false // Most recent first
      }));

      return result.Items as ContractAuditEntry[] || [];
    } catch (error) {
      logger.error(`Error getting audit trail for contract ${contractId}:`, error);
      throw new Error('Failed to get audit trail');
    }
  }

  /**
   * Create audit entry
   */
  private static async createAuditEntry(
    contractId: string, 
    action: ContractAuditAction, 
    performedBy: string, 
    details: Record<string, any> = {}
  ): Promise<void> {
    const auditId = uuidv4();
    const now = new Date().toISOString();

    const auditEntry: ContractAuditEntry = {
      id: auditId,
      contractId,
      action,
      performedBy,
      performedAt: now,
      details,
      ipAddress: 'system', // This would be populated from request context
      userAgent: 'system'
    };

    try {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `CONTRACT#${contractId}`,
          SK: `AUDIT#${now}#${auditId}`,
          ...auditEntry
        }
      }));
    } catch (error) {
      logger.error(`Error creating audit entry for contract ${contractId}:`, error);
      // Don't throw here as audit failures shouldn't break main operations
    }
  }

  /**
   * Generate contract number
   */
  static generateContractNumber(projectId: string): string {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const projectShort = projectId.substring(0, 8).toUpperCase();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `CON-${year}${month}-${projectShort}-${random}`;
  }

  /**
   * Get contract statistics
   */
  static async getStatistics(userId: string, userType: 'homeowner' | 'builder'): Promise<{
    total: number;
    byStatus: Record<ContractStatus, number>;
    totalValue: number;
    averageValue: number;
  }> {
    try {
      const contracts = userType === 'homeowner' 
        ? await this.getByHomeownerId(userId)
        : await this.getByBuilderId(userId);

      const byStatus: Record<ContractStatus, number> = {
        'draft': 0,
        'pending-signatures': 0,
        'partially-signed': 0,
        'fully-signed': 0,
        'active': 0,
        'suspended': 0,
        'completed': 0,
        'terminated': 0,
        'disputed': 0,
        'cancelled': 0
      };

      let totalValue = 0;

      contracts.forEach(contract => {
        byStatus[contract.status]++;
        totalValue += contract.terms.totalValue;
      });

      return {
        total: contracts.length,
        byStatus,
        totalValue,
        averageValue: contracts.length > 0 ? totalValue / contracts.length : 0
      };
    } catch (error) {
      logger.error(`Error getting contract statistics for ${userType} ${userId}:`, error);
      throw new Error('Failed to get contract statistics');
    }
  }
}