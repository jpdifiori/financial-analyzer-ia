-- View: v_active_card_liabilities
-- Description: Extracts active pending installments from the latest analysis for each credit card.

CREATE OR REPLACE VIEW v_active_card_liabilities AS
WITH latest_analyses AS (
    SELECT DISTINCT ON (card_id) *
    FROM analyses
    WHERE card_id IS NOT NULL
    ORDER BY card_id, created_at DESC
)
SELECT
    la.id AS analysis_id,
    la.user_id,
    la.card_id,
    COALESCE(la.summary->>'bank_name', 'Tarjeta') as bank_name,
    installment_data->>'description' AS description,
    COALESCE((installment_data->>'installment_amount')::numeric, (installment_data->>'amount')::numeric) AS monthly_amount,
    COALESCE(
        (installment_data->>'remaining_amount')::numeric,
        ((installment_data->>'total_installments')::int - (installment_data->>'current_installment')::int) * 
        COALESCE((installment_data->>'installment_amount')::numeric, (installment_data->>'amount')::numeric)
    ) AS remaining_amount,
    (installment_data->>'current_installment')::int AS current_installment,
    (installment_data->>'total_installments')::int AS total_installments,
    COALESCE(installment_data->>'currency', 'ARS') AS currency
FROM latest_analyses la
CROSS JOIN LATERAL jsonb_array_elements(
    CASE 
        WHEN jsonb_typeof(la.installments) = 'array' THEN la.installments 
        ELSE '[]'::jsonb 
    END
) AS installment_data
WHERE
    (installment_data->>'current_installment')::int < (installment_data->>'total_installments')::int
    AND COALESCE(
        (installment_data->>'remaining_amount')::numeric,
        ((installment_data->>'total_installments')::int - (installment_data->>'current_installment')::int) * 
        COALESCE((installment_data->>'installment_amount')::numeric, (installment_data->>'amount')::numeric)
    ) > 0;
