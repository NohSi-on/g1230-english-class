import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Uncaught error inside ErrorBoundary (${this.props.componentName}):`, error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-6 bg-red-50 border border-red-200 rounded-xl m-4">
                    <div className="flex items-center gap-3 mb-4 text-red-700">
                        <AlertTriangle size={24} />
                        <h2 className="text-lg font-bold">오류가 발생했습니다</h2>
                    </div>
                    <p className="text-sm text-red-600 mb-4 font-medium">
                        {this.props.componentName ? `[${this.props.componentName}] ` : ''}
                        화면을 렌더링하는 도중 문제가 생겼습니다.
                    </p>

                    <div className="bg-white p-4 rounded-lg border border-red-100 overflow-auto max-h-60 mb-4 text-xs font-mono text-slate-600">
                        <p className="font-bold text-red-500 mb-2">{this.state.error?.toString()}</p>
                        {this.state.errorInfo?.componentStack && (
                            <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                        )}
                    </div>

                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-bold flex items-center gap-2 text-sm transition-colors"
                    >
                        <RefreshCw size={14} />
                        페이지 새로고침
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
