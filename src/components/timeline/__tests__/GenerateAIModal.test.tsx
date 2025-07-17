/**
 * Critical integration tests for GenerateAIModal with v2 lambda function
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GenerateAIModal } from '../GenerateAIModal';
import { useAuthContext } from '../../AuthProvider';
import { useTimeline } from '../TimelineContext';

// Mock dependencies
jest.mock('../../AuthProvider');
jest.mock('../TimelineContext');
jest.mock('../../../lib/supabase/client');

// Mock fetch
global.fetch = jest.fn();

const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>;
const mockUseTimeline = useTimeline as jest.MockedFunction<typeof useTimeline>;

describe('GenerateAIModal - V2 Lambda Integration', () => {
  const mockProps = {
    projectId: 'test-project-id',
    isOpen: true,
    onClose: jest.fn(),
    onComplete: jest.fn()
  };

  const mockSession = {
    user: { id: 'test-user-id' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuthContext.mockReturnValue({
      isAuthenticated: true,
      loading: false,
      session: mockSession
    });

    mockUseTimeline.mockReturnValue({
      actions: {
        clearTimeline: jest.fn(),
        addTrack: jest.fn(),
        addItem: jest.fn(),
        state: { tracks: [] }
      }
    });
  });

  describe('Lambda API Integration', () => {
    it('should call lambda with correct payload format', async () => {
      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: {
            job_id: 'test-job-id',
            message: 'Generation started'
          }
        })
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      render(<GenerateAIModal {...mockProps} />);

      // Fill form
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Create an engaging TikTok video' }
      });

      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'tiktok' }
      });

      // Submit
      fireEvent.click(screen.getByText('Generate Timeline'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          'https://iw6lhqg9ji.execute-api.us-east-1.amazonaws.com/default/createEditDecisionList',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              project_id: 'test-project-id',
              user_id: 'test-user-id',
              user_prompt: 'Create an engaging TikTok video',
              platform: 'tiktok'
            })
          }
        );
      });
    });

    it('should handle lambda response format correctly', async () => {
      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: {
            job_id: '60d60925-5856-4567-818a-8800abf8fce5',
            message: 'Video generation started using new autonomous agents.'
          }
        })
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      render(<GenerateAIModal {...mockProps} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Test prompt' }
      });

      fireEvent.click(screen.getByText('Generate Timeline'));

      await waitFor(() => {
        expect(screen.getByText('Job ID: 60d60925-5856-4567-818a-8800abf8fce5')).toBeInTheDocument();
        expect(screen.getByText('Video generation started using new autonomous agents.')).toBeInTheDocument();
      });
    });

    it('should handle lambda error responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Lambda function failed' })
      });

      render(<GenerateAIModal {...mockProps} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Test prompt' }
      });

      fireEvent.click(screen.getByText('Generate Timeline'));

      await waitFor(() => {
        expect(screen.getByText('Generation Failed')).toBeInTheDocument();
        expect(screen.getByText('Lambda function failed')).toBeInTheDocument();
      });
    });
  });

  describe('Job Status Polling', () => {
    it('should poll job status after generation starts', async () => {
      // Mock Supabase client
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            job_id: 'test-job-id',
            status: 'processing',
            status_message: 'Content Intelligence Agent working...'
          },
          error: null
        })
      };

      jest.doMock('../../../lib/supabase/client', () => ({
        createClientSupabaseClient: () => mockSupabase
      }));

      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: { job_id: 'test-job-id', message: 'Started' }
        })
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      render(<GenerateAIModal {...mockProps} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Test prompt' }
      });

      fireEvent.click(screen.getByText('Generate Timeline'));

      // Wait for polling to start
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('edl_generation_jobs');
        expect(mockSupabase.eq).toHaveBeenCalledWith('job_id', 'test-job-id');
      });
    });

    it('should handle job completion and refresh', async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            job_id: 'test-job-id',
            status: 'completed',
            status_message: 'Generation completed successfully'
          },
          error: null
        })
      };

      // Mock window.location.reload
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload }
      });

      jest.doMock('../../../lib/supabase/client', () => ({
        createClientSupabaseClient: () => mockSupabase
      }));

      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: { job_id: 'test-job-id', message: 'Started' }
        })
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      render(<GenerateAIModal {...mockProps} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Test prompt' }
      });

      fireEvent.click(screen.getByText('Generate Timeline'));

      await waitFor(() => {
        expect(mockReload).toHaveBeenCalled();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('should be unclosable during generation', async () => {
      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          data: { job_id: 'test-job-id', message: 'Started' }
        })
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      render(<GenerateAIModal {...mockProps} />);

      // Initially closable
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Test prompt' }
      });

      fireEvent.click(screen.getByText('Generate Timeline'));

      // Should be unclosable during generation
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
        expect(screen.getByText('Generation in progress...')).toBeInTheDocument();
      });
    });

    it('should reset state when modal closes', () => {
      const { rerender } = render(<GenerateAIModal {...mockProps} />);

      // Fill form
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Test prompt' }
      });

      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: 'youtube' }
      });

      // Close modal
      rerender(<GenerateAIModal {...mockProps} isOpen={false} />);

      // Reopen modal
      rerender(<GenerateAIModal {...mockProps} isOpen={true} />);

      // Should be reset
      expect(screen.getByRole('textbox')).toHaveValue('');
      expect(screen.getByRole('combobox')).toHaveValue('tiktok');
    });
  });

  describe('Platform Selection', () => {
    it('should include all required platforms', () => {
      render(<GenerateAIModal {...mockProps} />);

      const select = screen.getByRole('combobox');
      
      expect(select).toHaveDisplayValue('TikTok - Vertical 9:16, 15-60 seconds');
      
      // Check all options are present
      fireEvent.click(select);
      
      expect(screen.getByText('TikTok - Vertical 9:16, 15-60 seconds')).toBeInTheDocument();
      expect(screen.getByText('YouTube - Horizontal 16:9, 5-20 minutes')).toBeInTheDocument();
      expect(screen.getByText('Instagram - Square 1:1 or vertical 9:16')).toBeInTheDocument();
      expect(screen.getByText('Twitter/X - Horizontal 16:9, up to 2 minutes')).toBeInTheDocument();
      expect(screen.getByText('LinkedIn - Horizontal 16:9, professional')).toBeInTheDocument();
    });
  });
});