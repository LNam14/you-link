import React, { useMemo, useState } from 'react';
import { Modal, Input, Button, Table, message, Radio, Space, Switch } from 'antd';
import { CopyOutlined, SwapOutlined } from '@ant-design/icons';

interface CurrencyConverterModalProps {
    isVisible: boolean;
    onClose: () => void;
}

// Parse a number possibly containing thousand separators, currency symbols/words, or abbreviations (K/M/B)
const parseFlexibleNumber = (raw: string): number => {
    if (!raw) return NaN;
    let input = raw.trim();
    if (!input) return NaN;

    // Abbreviation handling: 1k, 1.2m, 3b, 1k1 (interpreted as 1,001)
    const abbrMatch = input.match(/^(\d+(?:[.,]\d+)?)(?:\s*)?([kmbKMB])?(\d+)?$/);
    if (abbrMatch && (abbrMatch[2] || abbrMatch[3])) {
        const base = parseFloat(abbrMatch[1].replace(/,/g, '.'));
        if (!isNaN(base)) {
            let mult = 1;
            const unit = abbrMatch[2]?.toUpperCase();
            if (unit === 'K') mult = 1_000;
            else if (unit === 'M') mult = 1_000_000;
            else if (unit === 'B') mult = 1_000_000_000;
            const extra = abbrMatch[3] ? parseInt(abbrMatch[3], 10) : 0;
            return base * mult + extra;
        }
    }

    // Remove currency symbols/words
    input = input
        .replace(/\s+/g, '')
        .replace(/(vnđ|vnd|usd|us\$|đ|₫|\$|eur|€|aud|cad|gbp)/gi, '');

    // Keep only digits, separators and sign
    let s = input.replace(/[^0-9,\.\-]/g, '');

    // Decide decimal and thousand separators
    const hasComma = s.includes(',');
    const hasDot = s.includes('.');

    if (hasComma && hasDot) {
        // Use the last occurring separator as decimal, remove the other
        const lastComma = s.lastIndexOf(',');
        const lastDot = s.lastIndexOf('.');
        const decimalSep = lastComma > lastDot ? ',' : '.';
        const thousandSep = decimalSep === ',' ? '.' : ',';
        s = s.split(thousandSep).join('');
        if (decimalSep === ',') s = s.replace(',', '.');
    } else if (hasComma) {
        // Only comma present
        const parts = s.split(',');
        const last = parts[parts.length - 1];
        const groupsAllThree = parts.slice(0, -1).every((p) => p.length === 3) && parts[0].length <= 3;
        const moreThanOne = parts.length > 2;
        const isLikelyThousands = groupsAllThree || moreThanOne;
        if (isLikelyThousands) {
            s = parts.join('');
        } else if (last.length === 1 || last.length === 2) {
            s = parts.join('.');
        }
    } else if (hasDot) {
        // Only dot present
        const parts = s.split('.');
        const last = parts[parts.length - 1];
        const groupsAllThree = parts.slice(0, -1).every((p) => p.length === 3) && parts[0].length <= 3;
        const moreThanOne = parts.length > 2;
        const isLikelyThousands = groupsAllThree || moreThanOne; // 300.000 or 1.234.567
        if (isLikelyThousands) {
            s = parts.join('');
        } else if (last.length === 1 || last.length === 2) {
            // decimal like 12.5 or 12.50
            s = parts.join('.');
        } else {
            // If ambiguous, default to thousands removal when more than one dot
            if (parts.length > 2) s = parts.join('');
        }
    }

    const num = parseFloat(s);
    return isNaN(num) ? NaN : num;
};

const CurrencyConverterModal: React.FC<CurrencyConverterModalProps> = ({ isVisible, onClose }) => {
    const [input, setInput] = useState('');
    const [rate, setRate] = useState<number>(26000);
    const [direction, setDirection] = useState<'VND_TO_USD' | 'USD_TO_VND'>('VND_TO_USD');
    const [roundOutput, setRoundOutput] = useState<boolean>(true);

    const tokens = useMemo(() => {
        const currencyWord = /(vnđ|vnd|usd|us\$|đ|₫|\$|eur|€|aud|cad|gbp)/gi;
        return input
            .split(/[\n\s]+/)
            .map((t) => t.replace(currencyWord, '').trim())
            .filter((t) => t.length > 0);
    }, [input]);

    const results = useMemo(() => {
        return tokens.map((token) => {
            const value = parseFlexibleNumber(token);
            if (isNaN(value) || !isFinite(value)) {
                return { original: token, converted: 'Giá trị không hợp lệ' };
            }
            const convertedNumber = direction === 'VND_TO_USD' ? value / (rate || 1) : value * (rate || 1);
            const converted = direction === 'VND_TO_USD'
                ? (roundOutput ? Math.ceil(convertedNumber).toString() : convertedNumber.toFixed(2))
                : (roundOutput ? Math.ceil(convertedNumber).toString() : String(convertedNumber));
            return { original: token, converted };
        });
    }, [tokens, rate, direction, roundOutput]);

    const handleCopyConverted = () => {
        const convertedValues = results.map((r) => r.converted).join('\n');
        navigator.clipboard.writeText(convertedValues).then(
            () => message.success('Đã sao chép'),
            () => message.error('Không thể sao chép'),
        );
    };

    const columns = [
        { title: 'Giá trị gốc', dataIndex: 'original', key: 'original' },
        { title: 'Sau chuyển đổi', dataIndex: 'converted', key: 'converted' },
    ];

    return (
        <Modal
            title="Chuyển đổi tiền tệ"
            open={isVisible}
            onCancel={onClose}
            footer={null}
            width={700}
        >
            <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col">
                        <span className="text-sm mb-1">Tỉ giá (VND/USD)</span>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 select-none">₫</span>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-gray-300 bg-white px-9 pr-16 py-2.5 text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400"
                                value={rate ? rate.toLocaleString() : ''}
                                onChange={(e) => {
                                    const v = parseFlexibleNumber(e.target.value);
                                    if (isNaN(v)) {
                                        setRate(0);
                                    } else {
                                        const normalized = v < 1000 ? Math.round(v * 1000) : v;
                                        setRate(normalized);
                                    }
                                }}
                                placeholder="Ví dụ: 26.000"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5 select-none">VND/USD</span>
                        </div>
                    </div>
                    <div className="flex flex-col md:col-span-2">
                        <span className="text-sm mb-1">Hướng chuyển đổi</span>
                        <Radio.Group
                            value={direction}
                            onChange={(e) => setDirection(e.target.value)}
                        >
                            <Space direction="horizontal">
                                <Radio value="VND_TO_USD">VND ➜ USD</Radio>
                                <Radio value="USD_TO_VND">USD ➜ VND</Radio>
                            </Space>
                        </Radio.Group>
                    </div>
                </div>

                <Input.TextArea
                    placeholder="Nhập nhiều giá trị, ngăn cách bởi khoảng trắng hoặc xuống dòng (ví dụ: 100000 250k 1.5m 200usd)"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full"
                    rows={4}
                />

                {results.length > 0 && (
                    <div className="mt-2">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold m-0">Kết quả ({results.length} hàng)</h3>
                                <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200">
                                    <Switch size="small" checked={roundOutput} onChange={setRoundOutput} />
                                    <span className="text-xs text-gray-700">Làm tròn kết quả</span>
                                </div>
                            </div>
                            <Button icon={<CopyOutlined />} onClick={handleCopyConverted}>
                                Sao chép kết quả
                            </Button>
                        </div>
                        <Table
                            dataSource={results}
                            columns={columns}
                            pagination={false}
                            rowKey={(record, index: any) => index.toString()}
                            className="w-full"
                            size="small"
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default CurrencyConverterModal;

