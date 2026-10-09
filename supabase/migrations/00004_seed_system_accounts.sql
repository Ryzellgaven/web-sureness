
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@ldrrmo-diplahan.gov.ph') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (v_id, '00000000-0000-0000-0000-000000000000', 'admin@ldrrmo-diplahan.gov.ph', crypt('Admin@LDRRMO2025!', gen_salt('bf')), now(), '{"full_name":"LDRRMO Admin","role":"admin"}', '{"provider":"email","providers":["email"]}', 'authenticated', 'authenticated', now(), now(), '', '', '', '');
    INSERT INTO public.profiles (id, email, full_name, role, phone, address, is_active) VALUES (v_id, 'admin@ldrrmo-diplahan.gov.ph', 'LDRRMO Admin', 'admin', '+63-999-000-0001', 'LDRRMO Office, Diplahan, Zamboanga Sibugay', true) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'supervisor@ldrrmo-diplahan.gov.ph') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (v_id, '00000000-0000-0000-0000-000000000000', 'supervisor@ldrrmo-diplahan.gov.ph', crypt('Supervisor@LDRRMO2025!', gen_salt('bf')), now(), '{"full_name":"Maria Santos","role":"supervisor"}', '{"provider":"email","providers":["email"]}', 'authenticated', 'authenticated', now(), now(), '', '', '', '');
    INSERT INTO public.profiles (id, email, full_name, role, phone, address, is_active) VALUES (v_id, 'supervisor@ldrrmo-diplahan.gov.ph', 'Maria Santos', 'supervisor', '+63-999-000-0002', 'LDRRMO Office, Diplahan, Zamboanga Sibugay', true) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'responder1@ldrrmo-diplahan.gov.ph') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (v_id, '00000000-0000-0000-0000-000000000000', 'responder1@ldrrmo-diplahan.gov.ph', crypt('Responder@LDRRMO2025!', gen_salt('bf')), now(), '{"full_name":"Juan dela Cruz","role":"ldrrmo_staff"}', '{"provider":"email","providers":["email"]}', 'authenticated', 'authenticated', now(), now(), '', '', '', '');
    INSERT INTO public.profiles (id, email, full_name, role, phone, address, is_active) VALUES (v_id, 'responder1@ldrrmo-diplahan.gov.ph', 'Juan dela Cruz', 'ldrrmo_staff', '+63-999-000-0003', 'Diplahan, Zamboanga Sibugay', true) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'responder2@ldrrmo-diplahan.gov.ph') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (v_id, '00000000-0000-0000-0000-000000000000', 'responder2@ldrrmo-diplahan.gov.ph', crypt('Responder@LDRRMO2025!', gen_salt('bf')), now(), '{"full_name":"Ana Reyes","role":"ldrrmo_staff"}', '{"provider":"email","providers":["email"]}', 'authenticated', 'authenticated', now(), now(), '', '', '', '');
    INSERT INTO public.profiles (id, email, full_name, role, phone, address, is_active) VALUES (v_id, 'responder2@ldrrmo-diplahan.gov.ph', 'Ana Reyes', 'ldrrmo_staff', '+63-999-000-0004', 'Diplahan, Zamboanga Sibugay', true) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'resident.demo@ldrrmo-diplahan.gov.ph') THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, aud, role, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (v_id, '00000000-0000-0000-0000-000000000000', 'resident.demo@ldrrmo-diplahan.gov.ph', crypt('Resident@LDRRMO2025!', gen_salt('bf')), now(), '{"full_name":"Demo Resident","role":"resident"}', '{"provider":"email","providers":["email"]}', 'authenticated', 'authenticated', now(), now(), '', '', '', '');
    INSERT INTO public.profiles (id, email, full_name, role, phone, address, is_active) VALUES (v_id, 'resident.demo@ldrrmo-diplahan.gov.ph', 'Demo Resident', 'resident', '+63-999-000-0005', 'Barangay Centro, Diplahan, Zamboanga Sibugay', true) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
