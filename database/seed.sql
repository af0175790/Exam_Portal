-- ===================================================================
-- Seed: topics + starter question bank (run after schema.sql)
-- ===================================================================

INSERT INTO topics (name, category) VALUES
  ('Joins', 'sql'),
  ('Subqueries', 'sql'),
  ('CTE', 'sql'),
  ('Aggregation & Grouping', 'sql'),
  ('Window Functions', 'sql'),
  ('Python ETL', 'python'),
  ('Python EDA', 'python')
ON CONFLICT (name) DO NOTHING;

-- Note: the default admin user is created by `npm run seed` (server/src/scripts/runSeed.js),
-- which hashes the password properly with bcrypt at seed time rather than storing a
-- hard-coded hash here.

-- ---------------------------------------------------------------
-- SQL: JOINS
-- ---------------------------------------------------------------
INSERT INTO questions (topic_id, type, difficulty, title, statement, schema_setup, test_cases, points)
SELECT id, 'sql', 'easy',
'Inner Join: Employees and Departments',
'Tables: employees(id, name, department_id) and departments(id, dept_name).
Write a query to return employee name and department name for every employee who belongs to a department. Columns: name, dept_name. Order by employees.id.',
$$
CREATE TABLE departments (id INTEGER PRIMARY KEY, dept_name TEXT);
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, department_id INTEGER);
INSERT INTO departments VALUES (1,'Engineering'),(2,'Sales'),(3,'HR');
INSERT INTO employees VALUES (1,'Asha',1),(2,'Ravi',2),(3,'Meena',1),(4,'Kabir',NULL);
$$,
'[{"ordered": true, "expected_output": [["Asha","Engineering"],["Ravi","Sales"],["Meena","Engineering"]]}]'::jsonb,
10
FROM topics WHERE name='Joins';

INSERT INTO questions (topic_id, type, difficulty, title, statement, schema_setup, test_cases, points)
SELECT id, 'sql', 'medium',
'Left Join: Departments With No Employees',
'Tables: employees(id, name, department_id) and departments(id, dept_name).
List every department name along with the count of employees in it. Departments with zero employees must show 0. Columns: dept_name, emp_count. Order by dept_name.',
$$
CREATE TABLE departments (id INTEGER PRIMARY KEY, dept_name TEXT);
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, department_id INTEGER);
INSERT INTO departments VALUES (1,'Engineering'),(2,'Sales'),(3,'HR'),(4,'Marketing');
INSERT INTO employees VALUES (1,'Asha',1),(2,'Ravi',2),(3,'Meena',1);
$$,
'[{"ordered": true, "expected_output": [["Engineering",2],["HR",0],["Marketing",0],["Sales",1]]}]'::jsonb,
15
FROM topics WHERE name='Joins';

INSERT INTO questions (topic_id, type, difficulty, title, statement, schema_setup, test_cases, points)
SELECT id, 'sql', 'medium',
'Self Join: Employee Manager Pairs',
'Table employees(id, name, manager_id) where manager_id references employees.id.
Return each employee''s name along with their manager''s name. If an employee has no manager, show NULL for manager name. Columns: employee_name, manager_name. Order by employees.id.',
$$
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, manager_id INTEGER);
INSERT INTO employees VALUES (1,'Sara',NULL),(2,'Vik',1),(3,'Nina',1),(4,'Omar',2);
$$,
'[{"ordered": true, "expected_output": [["Sara",null],["Vik","Sara"],["Nina","Sara"],["Omar","Vik"]]}]'::jsonb,
15
FROM topics WHERE name='Joins';

INSERT INTO questions (topic_id, type, difficulty, title, statement, schema_setup, test_cases, points)
SELECT id, 'sql', 'hard',
'Full Outer Join Simulation: Students Not Enrolled and Courses With No Students',
'Tables: students(id, name) and enrollments(student_id, course).
Return a combined list of every student paired with every course they are enrolled in; students with no enrollment should appear with NULL as course, and there are no courses without students in this data. Columns: name, course. Order by students.id.',
$$
CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE enrollments (student_id INTEGER, course TEXT);
INSERT INTO students VALUES (1,'Ida'),(2,'Leo'),(3,'Zoe');
INSERT INTO enrollments VALUES (1,'Math'),(1,'Physics'),(2,'Math');
$$,
'[{"ordered": true, "expected_output": [["Ida","Math"],["Ida","Physics"],["Leo","Math"],["Zoe",null]]}]'::jsonb,
20
FROM topics WHERE name='Joins';

-- ---------------------------------------------------------------
-- SQL: SUBQUERIES
-- ---------------------------------------------------------------
INSERT INTO questions (topic_id, type, difficulty, title, statement, schema_setup, test_cases, points)
SELECT id, 'sql', 'easy',
'Scalar Subquery: Above Average Salary',
'Table employees(id, name, salary). Return names of employees whose salary is greater than the average salary of all employees. Column: name. Order by id.',
$$
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER);
INSERT INTO employees VALUES (1,'Asha',50000),(2,'Ravi',80000),(3,'Meena',30000),(4,'Kabir',90000);
$$,
'[{"ordered": true, "expected_output": [["Ravi"],["Kabir"]]}]'::jsonb,
10
FROM topics WHERE name='Subqueries';

INSERT INTO questions (topic_id, type, difficulty, title, statement, schema_setup, test_cases, points)
SELECT id, 'sql', 'medium',
'IN Subquery: Customers Who Placed Orders',
'Tables: customers(id, name) and orders(id, customer_id, amount). Return names of customers who have placed at least one order. Column: name. Order by id.',
$$
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount INTEGER);
INSERT INTO customers VALUES (1,'Nora'),(2,'Ben'),(3,'Ivy');
INSERT INTO orders VALUES (1,1,100),(2,1,50),(3,3,200);
$$,
'[{"ordered": true, "expected_output": [["Nora"],["Ivy"]]}]'::jsonb,
15
FROM topics WHERE name='Subqueries';

INSERT INTO questions (topic_id, type, difficulty, title, statement, schema_setup, test_cases, points)
SELECT id, 'sql', 'hard',
'Correlated Subquery: Highest Paid Per Department',
'Table employees(id, name, department_id, salary). Return the employee(s) who earn the maximum salary within their own department. Columns: name, department_id, salary. Order by department_id.',
$$
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, department_id INTEGER, salary INTEGER);
INSERT INTO employees VALUES
 (1,'Asha',1,70000),(2,'Ravi',1,90000),(3,'Meena',2,60000),(4,'Kabir',2,60000),(5,'Zed',3,40000);
$$,
'[{"ordered": true, "expected_output": [["Ravi",1,90000],["Meena",2,60000],["Kabir",2,60000],["Zed",3,40000]]}]'::jsonb,
20
FROM topics WHERE name='Subqueries';

-- ---------------------------------------------------------------
-- SQL: CTE
-- ---------------------------------------------------------------
INSERT INTO questions (topic_id, type, difficulty, title, statement, schema_setup, test_cases, points)
SELECT id, 'sql', 'medium',
'Basic CTE: Department Salary Totals',
'Table employees(id, name, department_id, salary). Using a CTE, compute total salary per department, then return only departments where the total exceeds 100000. Columns: department_id, total_salary. Order by department_id.',
$$
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, department_id INTEGER, salary INTEGER);
INSERT INTO employees VALUES
 (1,'Asha',1,70000),(2,'Ravi',1,90000),(3,'Meena',2,60000),(4,'Kabir',2,20000),(5,'Zed',3,40000);
$$,
'[{"ordered": true, "expected_output": [[1,160000],[2,80000]]}]'::jsonb,
15
FROM topics WHERE name='CTE';

INSERT INTO questions (topic_id, type, difficulty, title, statement, schema_setup, test_cases, points)
SELECT id, 'sql', 'hard',
'Recursive CTE: Employee Hierarchy Levels',
'Table employees(id, name, manager_id). The top manager has manager_id NULL. Using a recursive CTE, return each employee''s name and their level in the hierarchy (top manager = level 1). Columns: name, level. Order by level, id.',
$$
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT, manager_id INTEGER);
INSERT INTO employees VALUES (1,'Sara',NULL),(2,'Vik',1),(3,'Nina',1),(4,'Omar',2),(5,'Lia',4);
$$,
'[{"ordered": true, "expected_output": [["Sara",1],["Vik",2],["Nina",2],["Omar",3],["Lia",4]]}]'::jsonb,
25
FROM topics WHERE name='CTE';

INSERT INTO questions (topic_id, type, difficulty, title, statement, schema_setup, test_cases, points)
SELECT id, 'sql', 'medium',
'CTE with Ranking: Top Product Per Category',
'Table products(id, category, name, sales). Using a CTE and window function, return the top-selling product name per category. Columns: category, name, sales. Order by category.',
$$
CREATE TABLE products (id INTEGER PRIMARY KEY, category TEXT, name TEXT, sales INTEGER);
INSERT INTO products VALUES
 (1,'Books','Novel A',120),(2,'Books','Novel B',300),
 (3,'Toys','Car',150),(4,'Toys','Doll',400);
$$,
'[{"ordered": true, "expected_output": [["Books","Novel B",300],["Toys","Doll",400]]}]'::jsonb,
20
FROM topics WHERE name='CTE';

-- ---------------------------------------------------------------
-- SQL: Aggregation & Window (bonus coverage)
-- ---------------------------------------------------------------
INSERT INTO questions (topic_id, type, difficulty, title, statement, schema_setup, test_cases, points)
SELECT id, 'sql', 'easy',
'Group By: Orders Per Customer',
'Table orders(id, customer_id, amount). Return customer_id and total amount spent, only for customers with more than 1 order. Columns: customer_id, total_amount. Order by customer_id.',
$$
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, amount INTEGER);
INSERT INTO orders VALUES (1,1,100),(2,1,50),(3,2,200),(4,3,10),(5,3,20);
$$,
'[{"ordered": true, "expected_output": [[1,150],[3,30]]}]'::jsonb,
10
FROM topics WHERE name='Aggregation & Grouping';

INSERT INTO questions (topic_id, type, difficulty, title, statement, schema_setup, test_cases, points)
SELECT id, 'sql', 'hard',
'Window Function: Running Total of Sales',
'Table sales(id, sale_date, amount). Return sale_date, amount, and a running total ordered by sale_date. Columns: sale_date, amount, running_total.',
$$
CREATE TABLE sales (id INTEGER PRIMARY KEY, sale_date TEXT, amount INTEGER);
INSERT INTO sales VALUES (1,'2024-01-01',100),(2,'2024-01-02',150),(3,'2024-01-03',50);
$$,
'[{"ordered": true, "expected_output": [["2024-01-01",100,100],["2024-01-02",150,250],["2024-01-03",50,300]]}]'::jsonb,
20
FROM topics WHERE name='Window Functions';

-- ---------------------------------------------------------------
-- PYTHON: ETL
-- ---------------------------------------------------------------
INSERT INTO questions (topic_id, type, difficulty, title, statement, starter_code, test_cases, points)
SELECT id, 'python', 'easy',
'ETL: Clean and Transform Sales Records',
'You will receive CSV text via stdin with columns: name,amount (amount may have missing/blank values).
Read all lines from stdin, skip the header, drop rows where amount is blank, convert amount to int,
and print the total of all valid amounts as a single integer.',
'import sys

data = sys.stdin.read().strip().split("\n")
header, rows = data[0], data[1:]

total = 0
# TODO: parse each row, skip blank amount, sum valid amounts
for row in rows:
    pass

print(total)
',
'[{"input": "name,amount\nA,100\nB,\nC,50\nD,25", "expected_output": "175"}, {"input": "name,amount\nX,10\nY,20\nZ,30", "expected_output": "60"}]'::jsonb,
15
FROM topics WHERE name='Python ETL';

INSERT INTO questions (topic_id, type, difficulty, title, statement, starter_code, test_cases, points)
SELECT id, 'python', 'medium',
'ETL: Extract, Transform, Load into Dictionary Report',
'Stdin contains CSV rows: department,employee,salary (no header).
Build a dictionary mapping department -> total salary, then print each department and its total,
one per line, formatted as "department:total", sorted alphabetically by department name.',
'import sys

lines = sys.stdin.read().strip().split("\n")
totals = {}
# TODO: accumulate salary totals per department

for dept in sorted(totals):
    print(f"{dept}:{totals[dept]}")
',
'[{"input": "Eng,Asha,70000\nSales,Ravi,50000\nEng,Meena,30000", "expected_output": "Eng:100000\nSales:50000"}]'::jsonb,
20
FROM topics WHERE name='Python ETL';

INSERT INTO questions (topic_id, type, difficulty, title, statement, starter_code, test_cases, points)
SELECT id, 'python', 'hard',
'ETL: Deduplicate and Normalize Records',
'Stdin has lines "id,email" where the same id may repeat with different-cased emails (duplicates).
Keep only the LAST occurrence of each id (as it would appear scanning top to bottom),
lower-case the email, and print "id,email" sorted by id ascending, one per line.',
'import sys

lines = sys.stdin.read().strip().split("\n")
records = {}
# TODO: keep last occurrence per id, lower-case email

for rid in sorted(records, key=int):
    print(f"{rid},{records[rid]}")
',
'[{"input": "1,A@x.com\n2,B@x.com\n1,New@x.com", "expected_output": "1,new@x.com\n2,b@x.com"}]'::jsonb,
25
FROM topics WHERE name='Python ETL';

-- ---------------------------------------------------------------
-- PYTHON: EDA
-- ---------------------------------------------------------------
INSERT INTO questions (topic_id, type, difficulty, title, statement, starter_code, test_cases, points)
SELECT id, 'python', 'easy',
'EDA: Basic Descriptive Stats',
'Stdin contains one line of space-separated integers. Print three lines: the mean, the min, and the max,
each rounded/printed as: mean formatted to 2 decimal places, min and max as integers.',
'import sys

nums = list(map(int, sys.stdin.read().strip().split()))
# TODO: compute mean, min, max
mean_val = 0
min_val = 0
max_val = 0

print(f"{mean_val:.2f}")
print(min_val)
print(max_val)
',
'[{"input": "1 2 3 4 5", "expected_output": "3.00\n1\n5"}, {"input": "10 20 30", "expected_output": "20.00\n10\n30"}]'::jsonb,
10
FROM topics WHERE name='Python EDA';

INSERT INTO questions (topic_id, type, difficulty, title, statement, starter_code, test_cases, points)
SELECT id, 'python', 'medium',
'EDA: Missing Value Report',
'Stdin has CSV rows (no header) with 3 columns: a,b,c where any field may be empty.
Print the count of missing (empty) values per column as "a:<n>", "b:<n>", "c:<n>" each on its own line.',
'import sys

lines = [l.split(",") for l in sys.stdin.read().strip().split("\n")]
missing = {"a": 0, "b": 0, "c": 0}
# TODO: count empty strings per column

print(f"a:{missing[''a'']}")
print(f"b:{missing[''b'']}")
print(f"c:{missing[''c'']}")
',
'[{"input": "1,,3\n,5,6\n7,8,", "expected_output": "a:1\nb:1\nc:1"}]'::jsonb,
20
FROM topics WHERE name='Python EDA';

INSERT INTO questions (topic_id, type, difficulty, title, statement, starter_code, test_cases, points)
SELECT id, 'python', 'hard',
'EDA: Outlier Detection via IQR',
'Stdin contains one line of space-separated integers. Compute Q1 and Q3 using the median-of-halves method,
IQR = Q3 - Q1, and print all values considered outliers (below Q1 - 1.5*IQR or above Q3 + 1.5*IQR),
space-separated, in their original order. If there are no outliers, print an empty line.',
'import sys

nums = list(map(int, sys.stdin.read().strip().split()))
# TODO: compute Q1, Q3 (median of lower/upper half), IQR, and outliers in original order
outliers = []

print(" ".join(map(str, outliers)))
',
'[{"input": "1 2 2 3 3 4 4 5 100", "expected_output": "100"}]'::jsonb,
25
FROM topics WHERE name='Python EDA';
