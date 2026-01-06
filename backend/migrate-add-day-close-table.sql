-- Migration script to add day close table

CREATE TABLE IF NOT EXISTS day_close (
    day_close_id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200) NOT NULL,
    close_date DATE NOT NULL,
    opening_cash DECIMAL(10, 2) DEFAULT 0,
    opening_upi DECIMAL(10, 2) DEFAULT 0,
    closing_cash DECIMAL(10, 2) DEFAULT 0,
    closing_upi DECIMAL(10, 2) DEFAULT 0,
    extra_amount DECIMAL(10, 2) DEFAULT 0,
    extra_amount_description VARCHAR(500),
    payment_splits JSON,
    total_sales DECIMAL(10, 2) DEFAULT 0,
    total_expenses DECIMAL(10, 2) DEFAULT 0,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    UNIQUE KEY unique_company_date (company_name, close_date),
    INDEX idx_company_name (company_name),
    INDEX idx_close_date (close_date)
);


