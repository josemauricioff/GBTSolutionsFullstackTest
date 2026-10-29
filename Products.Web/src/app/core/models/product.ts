export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
}

export interface ProductRequest {
  name: string;
  price: number;
  stock: number;
}
