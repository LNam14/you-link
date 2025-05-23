import { NextResponse } from 'next/server'
import { ref, set, remove } from 'firebase/database'
import { database } from '@/lib/firebase'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const siteRef = ref(database, `sites/${params.id}`)
    
    await set(siteRef, {
      name: body.name,
      url: body.url,
      description: body.description || '',
    })

    return NextResponse.json({ message: 'Site updated successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const siteRef = ref(database, `sites/${params.id}`)
    await remove(siteRef)
    
    return NextResponse.json({ message: 'Site deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
  }
} 