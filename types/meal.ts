export interface Meal {
  id: string
  imageUrl: string | null
  foodName: string
  calories: number
  macros: {
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
  }
  recommendations: string[]
  createdAt: Date
}

export interface User {
  uid: string
  email: string
  displayName?: string
}
