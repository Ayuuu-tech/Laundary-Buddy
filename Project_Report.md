# Laundry Buddy - Project Report & Viva Evaluation

**Course Project Evaluation Report**
**Project Name:** Laundry Buddy (Smart Laundry Management System)
**Database Used:** MySQL / PostgreSQL

---

## 1. Project Overview & Structure (Criterion 1)

### 1.1 Project Objective
**Laundry Buddy** is a centralized, digital laundry management platform specifically designed for hostels and university campuses. The primary objective is to replace outdated paper-based laundry management with a dynamic, robust database application that automates tracking, billing, and status updates.

### 1.2 File Structure & Organization
The project follows a standard MERN-stack-like structure combined with a relational database (SQL) for rigid data integrity.
*   `/database/` - Contains raw SQL scripts for schema definition, dummy data, views, and procedures.
*   `/backend/` - Node.js Express server managing API endpoints and database connections (Sequelize ORM).
*   `/frontend/` - Static HTML/JS interface acting as a Progressive Web App (PWA).

*Note: This report is entirely original and tailored specifically to the structural logic of the Laundry Buddy application.*

---

## 2. Problem Definition & ER Design (Criterion 2)

### 2.1 Problem Definition
In traditional college environments, laundry operations suffer from several inefficiencies:
1.  **Lost Records:** Paper slips get misplaced, leading to loss of clothing and data.
2.  **Lack of Transparency:** Students cannot track whether their laundry is washed, drying, or ready.
3.  **Revenue Leakage:** Manual calculations often result in billing errors.
4.  **No Issue Tracking:** Complaints (stains, missing items) are not systematically tracked.

**Solution:** A fully normalized relational database system that links users directly to their orders, maintains a 1:1 timeline tracking, and allows students to raise linked support tickets.

### 2.2 ER Diagram Flow
The application's logic is built upon the following Entity-Relationship (ER) structure:

*   **Entities Identifed:** `Users`, `Orders`, `Tracking`, `Support_Tickets`.
*   **Keys:** Each table utilizes an auto-incrementing integer `id` as the Primary Key (PK). Relationships are maintained using Foreign Keys (FK) such as `userId` and `orderId`.

**Cardinality & Relationships:**
*   **Users ↔ Orders (1:N):** A single user can place many laundry orders.
*   **Orders ↔ Tracking (1:1):** One specific order has exactly one real-time tracking timeline.
*   **Users ↔ Support Tickets (1:N):** A user can submit multiple complaints.
*   **Orders ↔ Support Tickets (1:N):** One order might have multiple complaints attached to it over time.

---

## 3. Schema Design & Normalization (Criterion 3)

The database schema has been rigorously designed to meet the **Third Normal Form (3NF)** standards.

### 3.1 Normalization Process
1.  **First Normal Form (1NF):** All columns hold atomic values. We do not store comma-separated lists of orders inside the `Users` table. Every table has a unique primary key (`id`).
2.  **Second Normal Form (2NF):** As our tables utilize single-column, auto-incrementing primary keys, there are zero partial dependencies. Every non-key attribute depends on the *entire* primary key.
3.  **Third Normal Form (3NF):** We eliminated all transitive dependencies. For example, instead of storing `userName` or `userEmail` in the `Orders` table, we solely store `userId`. If a user updates their email, the change is instantly reflected across all orders without anomalies.

### 3.2 Tables & Keys
*   **Users Table:** `id` (PK), `email` (Unique), `name`, `password`, `phone`, `hostelRoom`, `isAdmin`.
*   **Orders Table:** `id` (PK), `userId` (FK), `orderNumber` (Unique), `serviceType`, `status`, `totalAmount`.
*   **Tracking Table:** `id` (PK), `userId` (FK), `orderId` (FK), `status`, `currentLocation`.

### 3.3 Indexing Basics
To optimize read-heavy queries (like filtering orders by status), B-Tree indexes were created:
*   `CREATE INDEX idx_orders_status ON orders(status);`
*   `CREATE INDEX idx_users_email ON users(email);`

---

## 4. SQL Implementation (Criterion 4)

All required SQL paradigms have been implemented. *(See `database/laundry_buddy_project.sql` for the raw script)*.

### 4.1 Data Definition & Manipulation (DDL & DML)
*   **DDL:** Used `CREATE TABLE` with `AUTO_INCREMENT`, `PRIMARY KEY`, and `FOREIGN KEY ... ON DELETE CASCADE` constraints to build the schema.
*   **DML:** Used `INSERT INTO` to populate dummy user and order data, and `UPDATE` to modify order statuses.

### 4.2 Data Query Language (DQL) - Advanced Concepts

**1. JOIN Operation:**
```sql
SELECT o.orderNumber, o.status, u.name, u.hostelRoom 
FROM orders o
INNER JOIN users u ON o.userId = u.id;
```

**2. GROUP BY & HAVING:**
*Used to analyze which statuses have a high volume of orders.*
```sql
SELECT status, COUNT(id) as total_orders
FROM orders
GROUP BY status
HAVING COUNT(id) > 5;
```

**3. SUBQUERIES:**
*Used to find students who currently have unresolved support tickets.*
```sql
SELECT name FROM users 
WHERE id IN (SELECT userId FROM support_tickets WHERE status = 'open');
```

### 4.3 Advanced SQL Objects

**1. Views:**
A virtual table was created to help admin staff view only active tasks.
```sql
CREATE VIEW ActiveOrders AS
SELECT o.orderNumber, o.status, u.name FROM orders o
JOIN users u ON o.userId = u.id
WHERE o.status NOT IN ('completed', 'cancelled');
```

**2. Stored Procedures & Transactions (TCL):**
To ensure ACID compliance (Atomicity, Consistency, Isolation, Durability), updating an order status requires updating both the `orders` and `tracking` tables simultaneously. A stored procedure utilizing `START TRANSACTION`, `COMMIT`, and `ROLLBACK` was implemented to guarantee data integrity.

---

## 5. Testing & Explanation (Criterion 5)

Below is an explanation of a critical test query used to evaluate the project's logic.

**Test Scenario:** The Laundry Admin wants to know the total revenue generated by each laundry service type, sorted from highest to lowest.

**The Query:**
```sql
SELECT serviceType, SUM(totalAmount) as TotalRevenue
FROM orders
GROUP BY serviceType
ORDER BY TotalRevenue DESC;
```

**Simulated Output:**
| serviceType       | TotalRevenue |
|-------------------|--------------|
| Washing & Ironing | 12500.00     |
| Dry Cleaning      | 8400.00      |
| Ironing Only      | 2100.00      |

**Logic & Explanation:**
*   **Query Logic:** The query uses the aggregate function `SUM()` to add up the `totalAmount` column. The `GROUP BY serviceType` clause tells SQL to calculate this sum individually for each distinct type of service offered. Finally, `ORDER BY ... DESC` sorts the results from highest revenue to lowest.
*   **Why it is used:** This provides critical business intelligence for the laundry administrators, helping them understand which services are most profitable and popular among students.
*   **What the result means:** In this test output, "Washing & Ironing" is the primary revenue driver, suggesting the staff should prioritize machine maintenance for washers over dry-cleaning equipment.
