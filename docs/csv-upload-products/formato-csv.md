# Formato CSV para Importación de Productos

## Encabezados (caso-insensitive)

El sistema lee los encabezados por nombre, **no por posición**. El orden de las columnas no importa, pero se recomienda el siguiente orden por claridad:

```
name,price,stock,category,sku,unit,min_stock,cost_price,qr_code,photo_url
```

## Columnas

### Requeridas (deben estar presentes en el CSV)

| Columna | Tipo | Ejemplo |
|---|---|---|
| `name` | Texto (1-100) | `"Leche Entera 1L"` |
| `price` | Decimal (>0) | `4.50` |
| `stock` | Entero (>=0) | `120` |

### Opcionales

| Columna | Tipo | Default | Ejemplo |
|---|---|---|---|
| `category` | Texto (1-50) | `null` | `"Lacteos"` |
| `category_id` | UUID | `null` | `"550e8400-e29b-41d4-a716-446655440000"` |
| `sku` | Texto (1-50) | Auto-generado | `"LAC-001"` |
| `unit` | Texto (1-20) | `"unidad"` | `"kg"` |
| `min_stock` | Entero (>=0) | `5` | `20` |
| `cost_price` | Decimal (>=0) | `null` | `3.20` |
| `qr_code` | Texto (1-100) | Auto-generado | `"QR-LAC001"` |
| `photo_url` | Texto (max 500) | `null` | `"https://ejemplo.com/foto.jpg"` |

### Notas importantes

- **`id`** no se incluye en el CSV. Se genera automáticamente.
- **`category`** y **`category_id`** son alternativas. Si se usan ambas, deben referirse a la misma categoría. Si no se provee ninguna, el producto queda sin categoría.
- **`sku`**: si se omite y hay categoría, se auto-genera secuencialmente (ej: `LAC-000001`, `LAC-000002`). Si se provee, se usa el valor tal cual (validando que no exista otro producto con el mismo SKU en tu tienda).
- **`qr_code`**: si se omite y hay SKU (propio o auto-generado), se genera como `QR-{sku}`. Si no hay SKU, se genera como `P-{codigo}`.
- **`category_id`** gana sobre `category`, si solo se pasa `category` se busca por nombre (case-insensitive).

## Ejemplos

### Mínimo (solo requeridos)

```csv
name,price,stock
"Leche Entera 1L",4.50,120
"Arroz 1kg",3.80,200
```

### Completo

```csv
name,price,stock,category,sku,unit,min_stock,cost_price,qr_code,photo_url
"Jabon Liquido 500ml",12.50,100,"Limpieza","JAB-001","unidad",10,8.00,QR-JAB001,https://ejemplo.com/jabon.jpg
"Arroz 1kg",3.80,200,"Abarrotes","ARZ-001","unidad",20,2.50,,
```

### Sin SKU ni QR (se auto-generan)

```csv
name,price,stock,category
"Leche Entera 1L",4.50,120,"Lacteos"
"Yogurt Natural 500ml",6.00,80,"Lacteos"
```
