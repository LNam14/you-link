"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Send, TestTube, Clock, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from 'antd';

export default function TelegramBotPage() {
    const [loading, setLoading] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [lastRun, setLastRun] = useState<string | null>(null);

    const handleTestBot = async () => {
        setTestLoading(true);
        try {
            const response = await fetch('/api/telegram/test');
            const result = await response.json();

            if (result.success) {
                toast.success('Test message sent successfully!');
            } else {
                toast.error(`Test failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Test error:', error);
            toast.error('Failed to send test message');
        } finally {
            setTestLoading(false);
        }
    };

    const handleSimpleTest = async () => {
        setTestLoading(true);
        try {
            const response = await fetch('/api/telegram/simple-test');
            const result = await response.json();

            if (result.success) {
                toast.success('Simple test completed successfully!');
            } else {
                toast.error(`Simple test failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Simple test error:', error);
            toast.error('Failed to run simple test');
        } finally {
            setTestLoading(false);
        }
    };

    const handleTestFormat = async () => {
        setTestLoading(true);
        try {
            const response = await fetch('/api/telegram/test-format');
            const result = await response.json();

            if (result.success) {
                toast.success('Format test completed successfully!');
            } else {
                toast.error(`Format test failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Format test error:', error);
            toast.error('Failed to run format test');
        } finally {
            setTestLoading(false);
        }
    };

    const handleTestCongNo = async () => {
        setTestLoading(true);
        try {
            const response = await fetch('/api/telegram/test-congno');
            const result = await response.json();

            if (result.success) {
                toast.success(`Cong no test completed! Found ${result.totalRecords} records`);
                console.log('Cong no data:', result.sampleData);
            } else {
                toast.error(`Cong no test failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Cong no test error:', error);
            toast.error('Failed to run cong no test');
        } finally {
            setTestLoading(false);
        }
    };

    const handleRunDailyReport = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/telegram/daily-report');
            const result = await response.json();

            if (result.success) {
                toast.success(`Daily report sent! ${result.messagesSent} messages sent.`);
                setLastRun(new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));
            } else {
                toast.error(`Daily report failed: ${result.error}`);
            }
        } catch (error) {
            console.error('Daily report error:', error);
            toast.error('Failed to run daily report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen py-6 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Telegram Bot Management</h1>
                    <p className="text-gray-600">Quản lý bot Telegram gửi thông báo hàng ngày</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Bot Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Bot Status
                            </CardTitle>
                            <CardDescription>
                                Trạng thái hoạt động của bot Telegram
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Bot Token:</span>
                                    <Badge variant="outline">8438379827:...D5U</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Chat ID:</span>
                                    <Badge variant="outline">-1002298300938</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Status:</span>
                                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                                </div>
                                {lastRun && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Last Run:</span>
                                        <span className="text-sm text-gray-600">{lastRun}</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cron Schedule */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Schedule
                            </CardTitle>
                            <CardDescription>
                                Lịch trình gửi thông báo tự động
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Frequency:</span>
                                    <Badge variant="outline">Daily</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Time:</span>
                                    <Badge variant="outline">12:10 PM (Vietnam)</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Cron Expression:</span>
                                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">10 12 * * *</code>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Test Bot */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TestTube className="h-5 w-5" />
                                Test Bot
                            </CardTitle>
                            <CardDescription>
                                Gửi tin nhắn test để kiểm tra kết nối
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Button
                                    onClick={handleTestBot}
                                    disabled={testLoading}
                                    className="w-full"
                                >
                                    {testLoading ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-4 w-4 mr-2" />
                                            Send Test Message
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleSimpleTest}
                                    disabled={testLoading}
                                    className="w-full"
                                    type="dashed"
                                >
                                    {testLoading ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <TestTube className="h-4 w-4 mr-2" />
                                            Simple Test
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleTestFormat}
                                    disabled={testLoading}
                                    className="w-full"
                                    type="dashed"
                                >
                                    {testLoading ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="h-4 w-4 mr-2" />
                                            Test Format
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleTestCongNo}
                                    disabled={testLoading}
                                    className="w-full"
                                    type="dashed"
                                >
                                    {testLoading ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <Users className="h-4 w-4 mr-2" />
                                            Test Cong No
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Manual Report */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                Manual Report
                            </CardTitle>
                            <CardDescription>
                                Chạy báo cáo thủ công ngay bây giờ
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                onClick={handleRunDailyReport}
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Running...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Run Daily Report
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Report Conditions */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Report Conditions</CardTitle>
                        <CardDescription>
                            Điều kiện để gửi thông báo trong báo cáo hàng ngày
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="border-l-4 border-red-500 pl-4">
                                <h4 className="font-semibold text-red-700">Case 1: Công nợ vượt Tín dụng</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    Gửi thông báo khi Công nợ &gt; Tín dụng
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Hiển thị: Mã mới, Công nợ, Tín dụng, Người chăm 1, Người chăm 2
                                </p>
                            </div>

                            <div className="border-l-4 border-yellow-500 pl-4">
                                <h4 className="font-semibold text-yellow-700">Case 2: Trạng thái Rủi ro</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    Gửi thông báo khi Tình trạng = "Rủi ro" hoặc "Rủi ro cao"
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Hiển thị: Mã mới, Công nợ, Tín dụng, Người chăm 1, Người chăm 2
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
