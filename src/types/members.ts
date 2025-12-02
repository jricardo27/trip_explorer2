export interface TripMember {
  id: string
  trip_id: string
  user_id?: string
  name: string
  email?: string
  role: "owner" | "editor" | "viewer"
  status: "pending" | "accepted" | "declined"
  color?: string
  avatar_url?: string
  joined_at?: string
}

export interface CreateMemberRequest {
  trip_id: string
  name: string
  email?: string
  role?: "owner" | "editor" | "viewer"
}
