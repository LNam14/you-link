import React, { useState } from 'react';
import { Modal, Input, Button, Table, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';

interface CurrencyConverterModalProps {
    isVisible: boolean;
    onClose: () => void;
}

const convertAbbreviatedNumber = (input: string): number => {
    const regex = /^(\d+(?:[.,]\d+)?)\s*([KMB])?(\d+)?$/i;
    const match = input.trim().replace(',', '.').match(regex);

    if (!match) return NaN;

    let [, num, unit, decimal] = match;
    let multiplier = 1;

    if (unit) {
        multiplier = unit.toUpperCase() === 'K' ? 1000 : unit.toUpperCase() === 'M' ? 1000000 : 1000000000;
    }

    let result = parseFloat(num) * multiplier;

    if (decimal) {
        result += parseInt(decimal);
    }

    return result;
};

const CurrencyConverterModal: React.FC<CurrencyConverterModalProps> = ({ isVisible, onClose }) => {
    const [input, setInput] = useState('');
    const [results, setResults] = useState<{ original: string; converted: string }[]>([]);

    const handleConvert = () => {
        const values = input.split('\n').filter(v => v.trim() !== '');
        const newResults = values.map(value => {
            const converted = convertAbbreviatedNumber(value);
            return {
                original: value,
                converted: isNaN(converted) ? 'Giá trị không hợp lệ' : converted.toString()
            };
        });
        setResults(newResults);
    };

    const handleCopyConverted = () => {
        const convertedValues = results.map(r => r.converted).join('\n');
        navigator.clipboard.writeText(convertedValues).then(() => {
            alert('Đã sao chép giá trị chuyển đổi');
        }, () => {
            message.error('Không thể sao chép giá trị');
        });
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const keyCode = event.which || event.keyCode;
        const keyValue = String.fromCharCode(keyCode);
        const isValidInput = /^[0-9KMBkmb\n.,]$/.test(keyValue);
        if (!isValidInput) {
            event.preventDefault();
        }
    };

    const columns = [
        {
            title: 'Giá trị gốc',
            dataIndex: 'original',
            key: 'original',
        },
        {
            title: 'Giá trị sau chuyển đổi',
            dataIndex: 'converted',
            key: 'converted',
        },
    ];

    return (
        <Modal
            title="Đổi mệnh giá"
            open={isVisible}
            onCancel={onClose}
            footer={null}
            width={600}
        >
            <div className="flex flex-col space-y-4">
                <Input.TextArea
                    placeholder="Nhập giá trị (mỗi giá trị một dòng, ví dụ: 10, 1K, 1M, 1k1, 1,1k)"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full"
                    rows={4}
                />
                <Button onClick={handleConvert} className="w-full bg-blue-500 text-white hover:bg-blue-600">
                    Chuyển đổi
                </Button>
                {results.length > 0 && (
                    <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold">Kết quả:</h3>
                            <Button
                                icon={<CopyOutlined />}
                                onClick={handleCopyConverted}
                                className="flex items-center"
                            >
                                Sao chép giá trị chuyển đổi
                            </Button>
                        </div>
                        <Table
                            dataSource={results}
                            columns={columns}
                            pagination={false}
                            rowKey={(record, index: any) => index.toString()}
                            className="w-full"
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default CurrencyConverterModal;

