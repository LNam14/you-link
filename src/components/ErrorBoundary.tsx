"use client"

import React from 'react'

interface Props {
    children: React.ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100">
                    <div className="max-w-xl p-8 text-center">
                        <h2 className="mb-4 text-xl font-bold text-gray-800">Đã xảy ra lỗi</h2>
                        <p className="text-gray-600 mb-8">Chúng tôi đang cố gắng khắc phục sự cố này. Vui lòng thử lại sau.</p>
                        <button
                            onClick={() => this.setState({ hasError: false })}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                            Thử lại
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
} 