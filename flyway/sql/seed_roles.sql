-- Seed initial roles
INSERT INTO role (name, description, created_at, updated_at) 
VALUES 
  ('ADMIN', 'System administrator', NOW(), NOW()),
  ('USER', 'Regular user', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Log seed completion
SELECT 'Roles seeded successfully!' as message;