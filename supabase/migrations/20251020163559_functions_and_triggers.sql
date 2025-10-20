/*
  ================================================================
  Functions and Triggers
  ================================================================
*/

-- Function to generate unique verification code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS text AS $$
DECLARE
  code text;
  exists boolean;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE verification_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Notify admins when new message arrives
CREATE OR REPLACE FUNCTION notify_admins_new_message()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link, related_id)
  SELECT
    p.id,
    'Yeni Müşteri Mesajı',
    (SELECT name FROM clients WHERE id = NEW.client_id) || ' yeni bir destek talebi gönderdi',
    'new_message',
    'messages',
    NEW.id
  FROM profiles p
  WHERE p.role = 'admin' OR p.id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_message ON customer_messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON customer_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_message();

-- Notify admins when renewal request is created
CREATE OR REPLACE FUNCTION notify_admins_renewal_request()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link, related_id)
  SELECT
    p.id,
    'Yeni Poliçe Yenileme Talebi',
    (SELECT name FROM clients c WHERE c.id = NEW.client_id) ||
    ' bir poliçe yenileme talebi gönderdi.',
    'policy_renewal',
    'renewals',
    NEW.id
  FROM profiles p
  WHERE p.role = 'admin' OR p.id = NEW.agent_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_renewal_request ON policy_renewal_requests;
CREATE TRIGGER trigger_notify_renewal_request
  AFTER INSERT ON policy_renewal_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_renewal_request();

-- Notify client when renewal status changes
CREATE OR REPLACE FUNCTION notify_client_renewal_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected', 'completed') THEN
    INSERT INTO notifications (user_id, title, message, type, link, related_id)
    SELECT
      c.user_id,
      CASE
        WHEN NEW.status = 'approved' THEN 'Yenileme Talebiniz Onaylandı'
        WHEN NEW.status = 'rejected' THEN 'Yenileme Talebiniz Reddedildi'
        WHEN NEW.status = 'completed' THEN 'Poliçeniz Yenilendi'
      END,
      CASE
        WHEN NEW.status = 'approved' THEN 'Poliçe yenileme talebiniz onaylandı.'
        WHEN NEW.status = 'rejected' THEN COALESCE('Red nedeni: ' || NEW.admin_notes, 'Talebiniz reddedildi.')
        WHEN NEW.status = 'completed' THEN 'Poliçeniz başarıyla yenilendi.'
      END,
      'policy_renewal',
      NULL,
      NEW.id
    FROM clients c
    WHERE c.id = NEW.client_id
      AND c.user_id IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_renewal_status ON policy_renewal_requests;
CREATE TRIGGER trigger_notify_renewal_status
  AFTER UPDATE ON policy_renewal_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_renewal_status();

-- Notify admin when document is uploaded
CREATE OR REPLACE FUNCTION notify_admin_document_upload()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = NEW.client_id
      AND c.user_id = NEW.uploaded_by
  ) THEN
    INSERT INTO notifications (user_id, title, message, type, link, related_id)
    SELECT
      NEW.agent_id,
      'Yeni Dosya Yüklendi',
      (SELECT name FROM clients c WHERE c.id = NEW.client_id) ||
      ' yeni bir dosya yükledi: ' || NEW.document_name,
      'new_message',
      'documents',
      NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_document_upload ON client_documents;
CREATE TRIGGER trigger_notify_document_upload
  AFTER INSERT ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_document_upload();