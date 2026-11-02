with open('src/lib/supabase/types.ts', 'r', encoding='utf-16') as f:
    content = f.read()

# Add new columns to orders Row type
content = content.replace(
    '          total_cents: number\n          updated_at: string\n        }\n        Insert: {',
    '          total_cents: number\n          updated_at: string\n          carrier: string | null\n          tracking_number: string | null\n          note: string | null\n          packed_at: string | null\n          shipped_at: string | null\n          delivered_at: string | null\n          cancelled_at: string | null\n        }\n        Insert: {'
)

# Add new columns to orders Insert type
content = content.replace(
    '          total_cents: number\n          updated_at?: string\n        }\n        Update: {',
    '          total_cents: number\n          updated_at?: string\n          carrier?: string | null\n          tracking_number?: string | null\n          note?: string | null\n          packed_at?: string | null\n          shipped_at?: string | null\n          delivered_at?: string | null\n          cancelled_at?: string | null\n        }\n        Update: {'
)

# Add new columns to orders Update type
content = content.replace(
    '          total_cents?: number\n          updated_at?: string\n        }\n        Relationships: [\n          {\n            foreignKeyName: "orders_customer_id_fkey"',
    '          total_cents?: number\n          updated_at?: string\n          carrier?: string | null\n          tracking_number?: string | null\n          note?: string | null\n          packed_at?: string | null\n          shipped_at?: string | null\n          delivered_at?: string | null\n          cancelled_at?: string | null\n        }\n        Relationships: [\n          {\n            foreignKeyName: "orders_customer_id_fkey"'
)

# Add stock_movements table before products
content = content.replace(
    '        ]\n      }\n      products: {',
    '        ]\n      }\n      stock_movements: {\n        Row: {\n          created_at: string\n          delta: number\n          id: string\n          product_id: string\n          reason: string\n          ref: string | null\n        }\n        Insert: {\n          created_at?: string\n          delta: number\n          id?: string\n          product_id: string\n          reason: string\n          ref?: string | null\n        }\n        Update: {\n          created_at?: string\n          delta?: number\n          id?: string\n          product_id?: string\n          reason?: string\n          ref?: string | null\n        }\n        Relationships: [\n          {\n            foreignKeyName: "stock_movements_product_id_fkey"\n            columns: ["product_id"]\n            isOneToOne: false\n            referencedRelation: "products"\n            referencedColumns: ["id"]\n          },\n        ]\n      }\n      products: {'
)

# Write back as UTF-8 (cleaner for TypeScript)
with open('src/lib/supabase/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done')