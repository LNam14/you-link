'use client'

import React, { useEffect, useState } from 'react'
import { Table, Button, Typography } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import EditableCell from './EditableCell'

const { Title, Text } = Typography

interface Product {
    key: string
    site: string
    price: number
    article: string
    resultLink: string
    keyWord: string
    anchor1: string
    link1: string
    anchor2: string
    link2: string
}

export default function ShoppingCart(dataSource: any) {
    const [data, setData] = useState<Product[]>([])

    useEffect(() => {
        // Chuyển đổi dataSource thành dữ liệu tương thích với interface Product
        const formattedData = dataSource.dataSource.map((item: any, index: any) => ({
            key: '',
            site: item.Site,
            price: isNaN(parseFloat(item['Giá GP'])) ? 0 : parseFloat(item['Giá GP']),
            article: '',
            resultLink: '',
            keyWord: item.Keywords || '',
            anchor1: '',
            link1: '',
            anchor2: '',
            link2: ''
        }))
        setData(formattedData)
    }, [])
    console.log(dataSource);

    const columns = [
        {
            title: 'Site',
            dataIndex: 'site',
            width: 150,
            editable: false,
        },
        {
            title: 'Price',
            dataIndex: 'price',
            width: 100,
            editable: false,
            render: (price: number) => `$${price.toFixed(2)}`,
        },
        {
            title: 'Bài viết',
            dataIndex: 'article',
            width: 150,
            editable: true,
        },
        {
            title: 'Link kết quả',
            dataIndex: 'resultLink',
            width: 150,
            editable: true,
        },
        {
            title: 'Key',
            dataIndex: 'keyWord',
            width: 100,
            editable: true,
        },
        {
            title: 'Anchor 1',
            dataIndex: 'anchor1',
            width: 100,
            editable: true,
        },
        {
            title: 'Link 1',
            dataIndex: 'link1',
            width: 150,
            editable: true,
        },
        {
            title: 'Anchor 2',
            dataIndex: 'anchor2',
            width: 100,
            editable: true,
        },
        {
            title: 'Link 2',
            dataIndex: 'link2',
            width: 150,
            editable: true,
        },
    ]

    const handleSave = (row: Product) => {
        const newData = [...data]
        const index = newData.findIndex(item => row.key === item.key)
        const item = newData[index]
        newData.splice(index, 1, {
            ...item,
            ...row,
        })
        setData(newData)
    }

    const components = {
        body: {
            cell: EditableCell,
        },
    }

    const mergedColumns = columns.map((col) => ({
        ...col,
        onCell: (record: Product) => ({
            record,
            editable: col.editable,
            dataIndex: col.dataIndex,
            title: col.title,
            handleSave,
        }),
    }))

    const handleSubmit = () => {
        console.log('Form submitted:', data)
    }

    return (
        <div>
            <Title level={4} className="text-center text-blue-600 mb-6">
                <ShoppingCartOutlined /> Xác nhận đơn hàng
            </Title>
            <Table
                components={components}
                rowClassName="editable-row"
                bordered
                dataSource={data}
                columns={mergedColumns}
                pagination={false}
                scroll={{ x: 'max-content' }}
                className="mb-4"
            />
            <div className="flex justify-between items-center mt-4">
                <Text strong>Total:</Text>
                <Text strong className="text-pink-600 text-xl">
                    ${data.reduce((sum, product) => sum + product.price, 0).toFixed(2)}
                </Text>
            </div>
            <Button
                type="primary"
                onClick={handleSubmit}
                className="w-full mt-6 bg-pink-500 hover:bg-pink-600"
                style={{ borderColor: '#f52f8d' }}
            >
                Xác nhận đặt đơn
            </Button>
        </div>
    )
}
