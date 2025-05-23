import { NextResponse } from 'next/server'
import { ref, get, set, remove } from 'firebase/database'
import { database } from '@/app/firebase/firebase'

export async function GET() {
  try {
    const sitesRef = ref(database, 'sites')
    const snapshot = await get(sitesRef)
    const sites = snapshot.val() || {}
    
    // Convert the object to an array
    const sitesArray = Object.entries(sites).map(([id, site]: [string, any]) => ({
      id,
      ...site,
    }))

    return NextResponse.json(sitesArray)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const sitesRef = ref(database, 'sites')
    const newSiteRef = ref(database, 'sites/' + Date.now())
    
    await set(newSiteRef, {
      name: body.name,
      url: body.url,
      description: body.description || '',
    })

    return NextResponse.json({ message: 'Site created successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 })
  }
} 