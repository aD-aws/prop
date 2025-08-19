import express from 'express';
import { 
  ContractGenerationRequest, 
  DigitalSignatureRequest,
  ContractStatus,
  ContractVariation,
  ContractPayment,
  AuthenticatedRequest
} from '../types';
import { ContractService } from '../services/ContractService';
import { authenticateToken as auth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Generate contract from selected quote
 * POST /api/contracts/generate
 */
router.post('/generate', auth, validateRequest, async (req: AuthenticatedRequest, res) => {
  try {
    const request: ContractGenerationRequest = req.body;
    
    // Validate user has permission to generate contract
    if (req.user?.userId !== request.homeownerId && req.user?.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to generate contract for this project'
        }
      });
    }

    const result = await ContractService.generateContract(request);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONTRACT_GENERATION_FAILED',
          message: 'Failed to generate contract',
          details: {
            errors: result.errors,
            warnings: result.warnings
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        contractId: result.contractId,
        contract: result.contract,
        generationTime: result.generationTime,
        warnings: result.warnings,
        legalReviewRequired: result.legalReviewRequired,
        complianceIssues: result.complianceIssues,
        recommendations: result.recommendations
      }
    });

  } catch (error) {
    logger.error('Error in contract generation endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * Get contract by ID
 * GET /api/contracts/:contractId
 */
router.get('/:contractId', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const { contractId } = req.params;
    const contract = await ContractService.getById(contractId);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found'
        }
      });
    }

    // Check user has permission to view contract
    if (req.user?.userId !== contract.homeownerId && 
        req.user?.userId !== contract.builderId && 
        req.user?.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to view this contract'
        }
      });
    }

    res.json({
      success: true,
      data: contract
    });
    return;

  } catch (error) {
    logger.error('Error getting contract:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * Update contract status
 * PUT /api/contracts/:contractId/status
 */
router.put('/:contractId/status', auth, validateRequest, async (req: AuthenticatedRequest, res) => {
  try {
    const { contractId } = req.params;
    const { status, reason }: { status: ContractStatus; reason?: string } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_STATUS',
          message: 'Status is required'
        }
      });
    }

    const contract = await ContractService.getById(contractId);
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found'
        }
      });
    }

    // Check user has permission to update contract
    if (req.user?.userId !== contract.homeownerId && 
        req.user?.userId !== contract.builderId && 
        req.user?.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to update this contract'
        }
      });
    }

    const updatedContract = await ContractService.updateStatus(
      contractId, 
      status, 
      req.user!.userId, 
      reason
    );

    res.json({
      success: true,
      data: updatedContract
    });

  } catch (error) {
    logger.error('Error updating contract status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * Request digital signature
 * POST /api/contracts/:contractId/signatures/request
 */
router.post('/:contractId/signatures/request', auth, validateRequest, async (req: AuthenticatedRequest, res) => {
  try {
    const { contractId } = req.params;
    const signatureRequest: Omit<DigitalSignatureRequest, 'contractId'> = req.body;

    const contract = await ContractService.getById(contractId);
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found'
        }
      });
    }

    // Check user has permission to request signatures
    if (req.user?.userId !== contract.homeownerId && 
        req.user?.userId !== contract.builderId && 
        req.user?.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to request signatures for this contract'
        }
      });
    }

    const result = await ContractService.requestDigitalSignature({
      ...signatureRequest,
      contractId
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SIGNATURE_REQUEST_FAILED',
          message: result.error || 'Failed to request signature'
        }
      });
    }

    res.json({
      success: true,
      data: {
        signatureId: result.signatureId,
        signingUrl: result.signingUrl,
        expiryDate: result.expiryDate,
        verificationCode: result.verificationCode
      }
    });

  } catch (error) {
    logger.error('Error requesting digital signature:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * Process digital signature
 * POST /api/contracts/:contractId/signatures/:signatureId/sign
 */
router.post('/:contractId/signatures/:signatureId/sign', async (req, res) => {
  try {
    const { contractId, signatureId } = req.params;
    const { signatureData, verificationCode } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    if (!signatureData || !verificationCode) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_SIGNATURE_DATA',
          message: 'Signature data and verification code are required'
        }
      });
    }

    const result = await ContractService.processDigitalSignature(
      contractId,
      signatureId,
      signatureData,
      verificationCode,
      ipAddress,
      userAgent
    );

    res.json({
      success: true,
      data: result
    });
    return;

  } catch (error) {
    logger.error('Error processing digital signature:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SIGNATURE_PROCESSING_FAILED',
        message: error instanceof Error ? error.message : 'Failed to process signature'
      }
    });
  }
});

/**
 * Add contract variation
 * POST /api/contracts/:contractId/variations
 */
router.post('/:contractId/variations', auth, validateRequest, async (req: AuthenticatedRequest, res) => {
  try {
    const { contractId } = req.params;
    const variationData: Omit<ContractVariation, 'id' | 'variationNumber'> = req.body;

    const contract = await ContractService.getById(contractId);
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found'
        }
      });
    }

    // Check user has permission to add variations
    if (req.user?.userId !== contract.homeownerId && 
        req.user?.userId !== contract.builderId && 
        req.user?.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to add variations to this contract'
        }
      });
    }

    const updatedContract = await ContractService.addVariation(
      contractId,
      variationData,
      req.user!.userId
    );

    res.json({
      success: true,
      data: updatedContract
    });

  } catch (error) {
    logger.error('Error adding contract variation:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * Complete milestone
 * PUT /api/contracts/:contractId/milestones/:milestoneId/complete
 */
router.put('/:contractId/milestones/:milestoneId/complete', auth, validateRequest, async (req: AuthenticatedRequest, res) => {
  try {
    const { contractId, milestoneId } = req.params;
    const { notes } = req.body;

    const contract = await ContractService.getById(contractId);
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found'
        }
      });
    }

    // Check user has permission to complete milestones
    if (req.user?.userId !== contract.homeownerId && 
        req.user?.userId !== contract.builderId && 
        req.user?.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to complete milestones for this contract'
        }
      });
    }

    const updatedContract = await ContractService.completeMilestone(
      contractId,
      milestoneId,
      req.user!.userId,
      notes
    );

    res.json({
      success: true,
      data: updatedContract
    });

  } catch (error) {
    logger.error('Error completing milestone:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * Record payment
 * POST /api/contracts/:contractId/payments
 */
router.post('/:contractId/payments', auth, validateRequest, async (req: AuthenticatedRequest, res) => {
  try {
    const { contractId } = req.params;
    const paymentData: Omit<ContractPayment, 'id'> = req.body;

    const contract = await ContractService.getById(contractId);
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CONTRACT_NOT_FOUND',
          message: 'Contract not found'
        }
      });
    }

    // Check user has permission to record payments
    if (req.user?.userId !== contract.homeownerId && 
        req.user?.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to record payments for this contract'
        }
      });
    }

    const updatedContract = await ContractService.recordPayment(
      contractId,
      paymentData,
      req.user!.userId
    );

    res.json({
      success: true,
      data: updatedContract
    });

  } catch (error) {
    logger.error('Error recording payment:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * Get contracts by homeowner
 * GET /api/contracts/homeowner/:homeownerId
 */
router.get('/homeowner/:homeownerId', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const { homeownerId } = req.params;
    const { status } = req.query;

    // Check user has permission to view contracts
    if (req.user?.userId !== homeownerId && req.user?.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to view these contracts'
        }
      });
    }

    const contracts = await ContractService.getByHomeownerId(
      homeownerId, 
      status as ContractStatus
    );

    res.json({
      success: true,
      data: contracts
    });

  } catch (error) {
    logger.error('Error getting homeowner contracts:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * Get contracts by builder
 * GET /api/contracts/builder/:builderId
 */
router.get('/builder/:builderId', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const { builderId } = req.params;
    const { status } = req.query;

    // Check user has permission to view contracts
    if (req.user?.userId !== builderId && req.user?.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to view these contracts'
        }
      });
    }

    const contracts = await ContractService.getByBuilderId(
      builderId, 
      status as ContractStatus
    );

    res.json({
      success: true,
      data: contracts
    });

  } catch (error) {
    logger.error('Error getting builder contracts:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

/**
 * Get contract statistics
 * GET /api/contracts/statistics/:userId
 */
router.get('/statistics/:userId', auth, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId } = req.params;
    const { userType } = req.query;

    // Check user has permission to view statistics
    if (req.user?.userId !== userId && req.user?.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Not authorized to view these statistics'
        }
      });
    }

    if (!userType || (userType !== 'homeowner' && userType !== 'builder')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_USER_TYPE',
          message: 'User type must be homeowner or builder'
        }
      });
    }

    const statistics = await ContractService.getStatistics(
      userId, 
      userType as 'homeowner' | 'builder'
    );

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    logger.error('Error getting contract statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      }
    });
  }
});

export default router;