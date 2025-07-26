import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SpecificationPreview } from '../SpecificationPreview';
import ConversationService from '../../../services/ConversationService';

// Mock the ConversationService
vi.mock('../../../services/ConversationService', () => ({
  default: {
    getSpecifications: vi.fn(),
    downloadSpecifications: vi.fn(),
    downloadSpecificationFile: vi.fn(),
    validateSpecifications: vi.fn(),
  },
}));

// Mock the store
vi.mock('../../../store', () => ({
  useAppStore: () => ({
    setError: vi.fn(),
  }),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// Mock URL.createObjectURL and revokeObjectURL
(global as any).URL.createObjectURL = vi.fn(() => 'mock-url');
(global as any).URL.revokeObjectURL = vi.fn();

const mockSpecificationData = {
  id: 'spec-123',
  files: {
    requirements: '# Requirements\n\nThis is the requirements document.',
    design: '# Design\n\nThis is the design document.',
    tasks: '# Tasks\n\n- [ ] Task 1\n- [ ] Task 2',
  },
  metadata: {
    conversationId: 'conv-123',
    title: 'Test App',
    appIdea: 'A test application',
    generatedAt: new Date('2024-01-01T00:00:00Z'),
    version: 1,
  },
  validation: {
    isValid: true,
    completeness: 95,
    issues: [],
  },
  fileSizes: {
    requirements: 1024,
    design: 2048,
    tasks: 512,
    total: 3584,
  },
  generationTimeMs: 1500,
};

const mockSpecificationDataWithIssues = {
  ...mockSpecificationData,
  validation: {
    isValid: false,
    completeness: 75,
    issues: [
      {
        file: 'requirements',
        section: 'User Stories',
        message: 'Missing acceptance criteria',
        severity: 'error' as const,
      },
      {
        file: 'design',
        section: 'Architecture',
        message: 'Consider adding error handling section',
        severity: 'warning' as const,
      },
    ],
  },
};

describe('SpecificationPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(ConversationService.getSpecifications).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<SpecificationPreview conversationId="conv-123" />);

    expect(screen.getByText('Loading specifications...')).toBeInTheDocument();
  });

  it('renders specification data correctly', async () => {
    vi.mocked(ConversationService.getSpecifications).mockResolvedValue(
      mockSpecificationData
    );

    render(<SpecificationPreview conversationId="conv-123" />);

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    expect(screen.getByText(/Generated on/)).toBeInTheDocument();
    expect(screen.getByText(/Version 1/)).toBeInTheDocument();
    expect(screen.getByText('Validation Status: Valid')).toBeInTheDocument();
    expect(screen.getByText('(95% complete)')).toBeInTheDocument();
    expect(screen.getByText(/Total size: 3.5 KB/)).toBeInTheDocument();
    expect(screen.getByText(/Generated in 1500ms/)).toBeInTheDocument();
  });

  it('renders validation issues when present', async () => {
    vi.mocked(ConversationService.getSpecifications).mockResolvedValue(
      mockSpecificationDataWithIssues
    );

    render(<SpecificationPreview conversationId="conv-123" />);

    await waitFor(() => {
      expect(
        screen.getByText('Validation Status: Issues Found')
      ).toBeInTheDocument();
    });

    expect(screen.getByText('(75% complete)')).toBeInTheDocument();
    expect(screen.getByText(/ERROR:/)).toBeInTheDocument();
    expect(screen.getByText(/WARNING:/)).toBeInTheDocument();
    expect(screen.getByText(/Missing acceptance criteria/)).toBeInTheDocument();
    expect(
      screen.getByText(/Consider adding error handling section/)
    ).toBeInTheDocument();
  });

  it('switches between tabs correctly', async () => {
    vi.mocked(ConversationService.getSpecifications).mockResolvedValue(
      mockSpecificationData
    );

    render(<SpecificationPreview conversationId="conv-123" />);

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    // Initially shows requirements tab
    expect(
      screen.getByText('This is the requirements document.')
    ).toBeInTheDocument();

    // Click on design tab
    fireEvent.click(screen.getByText('Design'));
    expect(
      screen.getByText('This is the design document.')
    ).toBeInTheDocument();

    // Click on tasks tab
    fireEvent.click(screen.getByText('Tasks'));
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
  });

  it('copies file content to clipboard', async () => {
    vi.mocked(ConversationService.getSpecifications).mockResolvedValue(
      mockSpecificationData
    );
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue();

    render(<SpecificationPreview conversationId="conv-123" />);

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    const copyButton = screen.getByRole('button', { name: /Copy/ });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        mockSpecificationData.files.requirements
      );
    });

    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('downloads individual file', async () => {
    vi.mocked(ConversationService.getSpecifications).mockResolvedValue(
      mockSpecificationData
    );
    vi.mocked(
      ConversationService.downloadSpecificationFile
    ).mockResolvedValue();

    render(<SpecificationPreview conversationId="conv-123" />);

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    const downloadButtons = screen.getAllByRole('button', { name: /Download/ });
    const individualDownloadButton = downloadButtons.find(
      (btn) =>
        btn.textContent?.includes('Download') &&
        !btn.textContent?.includes('ZIP')
    );
    fireEvent.click(individualDownloadButton!);

    await waitFor(() => {
      expect(
        ConversationService.downloadSpecificationFile
      ).toHaveBeenCalledWith('conv-123', 'requirements');
    });
  });

  it('downloads ZIP file', async () => {
    vi.mocked(ConversationService.getSpecifications).mockResolvedValue(
      mockSpecificationData
    );
    vi.mocked(ConversationService.downloadSpecifications).mockResolvedValue();

    render(<SpecificationPreview conversationId="conv-123" />);

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    const downloadZipButton = screen.getByRole('button', {
      name: /Download ZIP/,
    });
    fireEvent.click(downloadZipButton);

    await waitFor(() => {
      expect(ConversationService.downloadSpecifications).toHaveBeenCalledWith(
        'conv-123'
      );
    });
  });

  it('validates specifications', async () => {
    vi.mocked(ConversationService.getSpecifications).mockResolvedValue(
      mockSpecificationData
    );
    vi.mocked(ConversationService.validateSpecifications).mockResolvedValue({
      isValid: true,
      completeness: 100,
      issues: [],
    });

    render(<SpecificationPreview conversationId="conv-123" />);

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    const validateButton = screen.getByRole('button', { name: /Re-validate/ });
    fireEvent.click(validateButton);

    await waitFor(() => {
      expect(ConversationService.validateSpecifications).toHaveBeenCalledWith(
        'conv-123'
      );
    });
  });

  it('handles error state', async () => {
    vi.mocked(ConversationService.getSpecifications).mockRejectedValue(
      new Error('Failed to load specifications')
    );

    render(<SpecificationPreview conversationId="conv-123" />);

    await waitFor(() => {
      expect(
        screen.getByText('Error Loading Specifications')
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText('Failed to load specifications')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Try Again/ })
    ).toBeInTheDocument();
  });

  it('handles empty specifications', async () => {
    vi.mocked(ConversationService.getSpecifications).mockResolvedValue(
      null as unknown as unknown
    );

    render(<SpecificationPreview conversationId="conv-123" />);

    await waitFor(() => {
      expect(screen.getByText('No Specifications Found')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'No specifications have been generated for this conversation yet.'
      )
    ).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    vi.mocked(ConversationService.getSpecifications).mockResolvedValue(
      mockSpecificationData
    );

    render(
      <SpecificationPreview conversationId="conv-123" onClose={onClose} />
    );

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /Close/ });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('formats file sizes correctly', async () => {
    const largeSpecData = {
      ...mockSpecificationData,
      fileSizes: {
        requirements: 1024 * 1024, // 1 MB
        design: 2048, // 2 KB
        tasks: 512, // 512 B
        total: 1024 * 1024 + 2048 + 512,
      },
    };

    vi.mocked(ConversationService.getSpecifications).mockResolvedValue(
      largeSpecData
    );

    render(<SpecificationPreview conversationId="conv-123" />);

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    expect(screen.getByText(/Total size: 1.0 MB/)).toBeInTheDocument();
    expect(screen.getByText(/\(1.0 MB\)/)).toBeInTheDocument(); // Requirements tab
  });

  it('handles clipboard copy failure gracefully', async () => {
    vi.mocked(ConversationService.getSpecifications).mockResolvedValue(
      mockSpecificationData
    );
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(
      new Error('Clipboard access denied')
    );

    render(<SpecificationPreview conversationId="conv-123" />);

    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument();
    });

    const copyButton = screen.getByRole('button', { name: /Copy/ });
    fireEvent.click(copyButton);

    // Just verify the copy function was called and failed
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });
});
