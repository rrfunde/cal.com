import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui";

interface BookingTermsProps {
  onAccept: () => void;
}

export const BookingTerms = ({ onAccept }: BookingTermsProps) => {
  const [checked, setChecked] = useState(false);
  const { t } = useLocale();

  return (
    <div className="p-4">
      <h2 className="mb-2 text-lg font-semibold">{t("terms_and_conditions")}</h2>
      <p className="mb-4">{t("please_read_terms")}</p>
      <div className="mb-4 flex items-center">
        <input
          type="checkbox"
          id="terms"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="terms">{t("accept_terms")}</label>
      </div>
      <Button onClick={onAccept} disabled={!checked} color="primary">
        {t("continue")}
      </Button>
    </div>
  );
};
