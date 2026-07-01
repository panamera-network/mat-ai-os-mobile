import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from './storageKeys'

export type QueueItemType = 'memo' | 'reminder'

export interface QueueItem {
  id: string
  type: QueueItemType
  text: string
  createdAt: string
}

async function load(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.offlineQueue)
    return raw ? (JSON.parse(raw) as QueueItem[]) : []
  } catch {
    return []
  }
}

async function save(items: QueueItem[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.offlineQueue, JSON.stringify(items))
}

export async function enqueue(type: QueueItemType, text: string): Promise<QueueItem> {
  const item: QueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    text,
    createdAt: new Date().toISOString(),
  }
  const items = await load()
  items.push(item)
  await save(items)
  return item
}

export async function getQueue(): Promise<QueueItem[]> {
  return load()
}

export async function removeFromQueue(id: string): Promise<void> {
  const items = await load()
  await save(items.filter(i => i.id !== id))
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.offlineQueue)
}
