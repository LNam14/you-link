import React, { useState, useRef, useEffect } from 'react'
import { Input } from 'antd'

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

const EditableCell: React.FC<{
    dataIndex: string
    title: string
    inputType: 'number' | 'text'
    record: Product
    index: number
    children: React.ReactNode
    handleSave: (record: Product) => void
}> = ({
    dataIndex,
    title,
    inputType,
    record,
    index,
    children,
    handleSave,
    ...restProps
}) => {
        const [editing, setEditing] = useState(false)
        const inputRef = useRef<any>(null)
        const form = useRef<HTMLFormElement>(null)

        useEffect(() => {
            if (editing) {
                inputRef.current!.focus()
            }
        }, [editing])

        const toggleEdit = () => {
            setEditing(!editing)
        }

        const save = () => {
            const value = inputRef.current!.input!.value
            handleSave({ ...record, [dataIndex]: value })
            toggleEdit()
        }

        let childNode = children

        if (editing) {
            childNode = (
                <form
                    ref={form}
                    onSubmit={(e) => {
                        e.preventDefault()
                        save()
                    }}
                >
                    <Input
                        className="h-4 rounded-none border-none p-0"
                        ref={inputRef}
                        onBlur={save}
                        onPressEnter={save}
                        defaultValue={record[dataIndex as keyof Product]}
                    />
                </form>
            )
        }

        return (
            <td {...restProps} onClick={toggleEdit} style={{ padding: 5, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {childNode}
            </td>
        )
    }

export default EditableCell
