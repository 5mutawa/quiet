export type CommunityId = string
export type RegistrarId = string

export type ConnectedPeers = string[]

export interface NetworkDataPayload {
  peer: string
  connectionDuration: number
  lastSeen: number
}

export interface NetworkStats {
  peerId: string
  lastSeen: number
  connectionTime: number
}
