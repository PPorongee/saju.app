'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(170deg, #0A0E2A 0%, #141850 40%, #0D1235 70%, #080B20 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            fontFamily: "'Gowun Dodum', 'Noto Sans KR', sans-serif",
            color: '#F5F0E8',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✨</div>
          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: '#F0C75E',
              marginBottom: '12px',
            }}
          >
            잠깐, 별이 길을 잃었어
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              color: 'rgba(245,240,232,0.6)',
              marginBottom: '32px',
              lineHeight: 1.6,
            }}
          >
            Something went wrong. Please try again.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #F0C75E, #FFD080)',
              color: '#0A0E2A',
              border: 'none',
              borderRadius: '24px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Gowun Dodum', 'Noto Sans KR', sans-serif",
            }}
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
