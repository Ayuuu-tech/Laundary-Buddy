# Laundry Buddy — ER Diagram Files

## Files Generated

| File | Format | Description |
|------|--------|-------------|
| `ER_DIAGRAM.dot` | GraphViz DOT | Source file for rendering with `dot` CLI |
| `ER_DIAGRAM.drawio` | draw.io XML | **Editable draw.io / diagrams.net file** ✅ |
| `ER_DIAGRAM.png` | PNG Image | Rendered raster export |
| `ER_DIAGRAM.svg` | SVG Vector | Rendered vector export |

## How to Open `ER_DIAGRAM.drawio`

### Option A – Online (diagrams.net)
1. Go to [https://app.diagrams.net/](https://app.diagrams.net/)
2. Click **File → Open From → Device…**
3. Select `ER_DIAGRAM.drawio`

### Option B – VS Code Extension
- Install the [Draw.io Integration](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio) extension
- Double-click `ER_DIAGRAM.drawio` in the Explorer

### Option C – Desktop App
- Download from [https://github.com/jgraph/drawio-desktop/releases](https://github.com/jgraph/drawio-desktop/releases)
- Open the `.drawio` file directly

---

## Entities Covered

| Entity | Color | Notes |
|--------|-------|-------|
| **Users** | Blue | Core entity; PK=`_id` |
| **Orders** | Blue | FK→Users; embeds OrderItems |
| **OrderItems** | Orange | Weak/embedded entity inside Orders |
| **Tracking** | Blue | FK→Users, FK→Orders |
| **Subscriptions** | Blue | FK→Users; TTL 90 days |
| **SupportTickets** | Blue | FK→Users, FK→Orders |
| **ContactMessages** | Blue | FK→Users (sender + admin responder) |
| **SecurityLogs** | Blue | FK→Users (optional); TTL 90 days |

## Relationships

| From | To | Cardinality | Label |
|------|----|-------------|-------|
| Users | Orders | 1 : M | places |
| Users | Tracking | 1 : M | tracks |
| Users | Subscriptions | 1 : M | subscribes |
| Users | SupportTickets | 1 : M | raises |
| Users | ContactMessages | 0..1 : M | sends |
| Users | SecurityLogs | 0..1 : M | generates |
| Users | ContactMessages | 0..1 : M | responds (Admin) — dashed |
| Orders | Tracking | 1 : 0..1 | tracked by |
| Orders | SupportTickets | 1 : M | ticket for |
| Orders | OrderItems | 1 : M | contains (embedded) |
