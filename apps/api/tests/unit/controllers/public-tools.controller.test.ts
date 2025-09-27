import { Request, Response, NextFunction } from 'express';
import {
  publicToolsController,
  PublicTool,
} from '../../../src/controllers/public-tools.controller';
import { toolsService } from '../../../src/services/tools.service';

// Mock the tools service
jest.mock('../../../src/services/tools.service');

describe('PublicToolsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('getPublicTools', () => {
    const mockTools = [
      {
        id: '1',
        key: 'tool1',
        name: 'Tool 1',
        description: 'Description 1',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        key: 'tool2',
        name: 'Tool 2',
        description: 'Description 2',
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        key: 'tool3',
        name: 'Tool 3',
        description: 'Description 3',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should return only active tools', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        data: { tools: mockTools },
        etag: 'test-etag',
      };
      (toolsService.getTools as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await publicToolsController.getPublicTools(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(toolsService.getTools).toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Cache-Control': 'public, max-age=300',
        ETag: expect.any(String),
        'Content-Type': 'application/json',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          tools: [
            {
              key: 'tool1',
              name: 'Tool 1',
              description: 'Description 1',
              active: true,
            },
            {
              key: 'tool3',
              name: 'Tool 3',
              description: 'Description 3',
              active: true,
            },
          ],
        },
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Service error');
      (toolsService.getTools as jest.Mock).mockRejectedValue(error);

      // Act
      await publicToolsController.getPublicTools(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getPublicToolStatus', () => {
    const mockTool = {
      id: '1',
      key: 'test-tool',
      name: 'Test Tool',
      description: 'Test Description',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return tool status for active tool', async () => {
      // Arrange
      mockRequest.params = { key: 'test-tool' };
      (toolsService.getToolByKey as jest.Mock).mockResolvedValue(mockTool);

      // Act
      await publicToolsController.getPublicToolStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(toolsService.getToolByKey).toHaveBeenCalledWith('test-tool');
      expect(mockResponse.set).toHaveBeenCalledWith({
        'Cache-Control': 'public, max-age=300',
        ETag: expect.any(String),
        'Content-Type': 'application/json',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          tool: {
            key: 'test-tool',
            name: 'Test Tool',
            description: 'Test Description',
            active: true,
          },
        },
      });
    });

    it('should return 404 for inactive tool', async () => {
      // Arrange
      const inactiveTool = { ...mockTool, active: false };
      mockRequest.params = { key: 'inactive-tool' };
      (toolsService.getToolByKey as jest.Mock).mockResolvedValue(inactiveTool);

      // Act
      await publicToolsController.getPublicToolStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tool not found or disabled',
      });
    });

    it('should return 404 for non-existent tool', async () => {
      // Arrange
      mockRequest.params = { key: 'non-existent' };
      (toolsService.getToolByKey as jest.Mock).mockResolvedValue(null);

      // Act
      await publicToolsController.getPublicToolStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tool not found or disabled',
      });
    });

    it('should return 400 for invalid key', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await publicToolsController.getPublicToolStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Tool key is required',
      });
    });

    it('should handle service errors', async () => {
      // Arrange
      const error = new Error('Service error');
      mockRequest.params = { key: 'test-tool' };
      (toolsService.getToolByKey as jest.Mock).mockRejectedValue(error);

      // Act
      await publicToolsController.getPublicToolStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
