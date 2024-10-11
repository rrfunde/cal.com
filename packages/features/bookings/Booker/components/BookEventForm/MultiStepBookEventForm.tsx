import { Trans } from "next-i18next";
import type { TFunction } from "next-i18next";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";

import { WEBSITE_PRIVACY_POLICY_URL, WEBSITE_TERMS_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Button } from "@calcom/ui";

import { useBookerStore } from "../../store";
import { BookingFields } from "./BookingFields";
import { ProgressBar } from "./ProgressBar";
import { FormSkeleton } from "./Skeleton";

const getError = (formErrors: string[], dataErrors: string[], t: TFunction) => {
  const error = formErrors[0] || dataErrors[0];
  return error ? t(error) : t("something_went_wrong");
};

export const MultiStepBookEventForm = ({
  onSubmit,
  onCancel,
  eventQuery,
  rescheduleUid,
  errorRef,
  errors: externalErrors,
  loadingStates,
  renderConfirmNotVerifyEmailButtonCond,
  handleVerifyEmail,
  layout,
  extraOptions,
  isPlatform = false,
  isVerificationCodeSending,
}) => {
  const { t } = useLocale();
  const [currentStep, setCurrentStep] = useState(0);

  const username = useBookerStore((state) => state.username);
  const setFormValues = useBookerStore((state) => state.setFormValues);
  const formValues = useBookerStore((state) => state.formValues);
  const bookingData = useBookerStore((state) => state.bookingData);
  const timeslot = useBookerStore((state) => state.selectedTimeslot);
  const isInstantMeeting = useBookerStore((state) => state.isInstantMeeting);

  const eventType = eventQuery.data;

  const bookingFields = useMemo(() => {
    return eventType?.bookingFields?.filter((field) => !field.hidden) || [];
  }, [eventType?.bookingFields]);

  const form = useForm({
    defaultValues: formValues,
  });

  const totalSteps = bookingFields.length;

  useEffect(() => {
    setFormValues(form.getValues());
  }, [form, setFormValues]);

  if (eventQuery.isError) return <Alert severity="warning" message={t("error_booking_event")} />;
  if (eventQuery.isPending || !eventQuery.data) return <FormSkeleton />;
  if (!timeslot) {
    return <div>{t("timeslot_missing")}</div>;
  }

  const handleNext = async () => {
    const currentField = bookingFields[currentStep];
    const isValid = await form.trigger(currentField.name);
    if (isValid) {
      const updatedValues = form.getValues();
      setFormValues(updatedValues);
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        if (renderConfirmNotVerifyEmailButtonCond) {
          onSubmit();
        } else {
          handleVerifyEmail();
        }
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      onCancel();
    }
  };

  const currentField = bookingFields[currentStep];

  return (
    <FormProvider {...form}>
      <div className="flex h-full flex-col">
        <ProgressBar
          progress={(currentStep / (totalSteps - 1)) * 100}
          currentStep={currentStep}
          totalSteps={totalSteps}
          className="mb-4"
        />
        <form className="flex h-full flex-col">
          <BookingFields
            fields={[currentField]}
            locations={eventType.locations}
            rescheduleUid={rescheduleUid}
            isDynamicGroupBooking={!!(username && username.indexOf("+") > -1)}
            bookingData={bookingData}
          />
          {(externalErrors.hasFormErrors || externalErrors.hasDataErrors) && (
            <div data-testid="booking-fail">
              <Alert
                ref={errorRef}
                className="my-2"
                severity="info"
                title={rescheduleUid ? t("reschedule_fail") : t("booking_fail")}
                message={getError(externalErrors.formErrors, externalErrors.dataErrors, t)}
              />
            </div>
          )}
          {!isPlatform && currentStep === totalSteps - 1 && (
            <div className="text-subtle my-3 w-full text-xs opacity-80">
              <Trans
                i18nKey="signing_up_terms"
                components={[
                  <Link
                    className="text-emphasis hover:underline"
                    key="terms"
                    href={`${WEBSITE_TERMS_URL}`}
                    target="_blank">
                    Terms
                  </Link>,
                  <Link
                    className="text-emphasis hover:underline"
                    key="privacy"
                    href={`${WEBSITE_PRIVACY_POLICY_URL}`}
                    target="_blank">
                    Privacy Policy
                  </Link>,
                ]}
              />
            </div>
          )}
          <div className="mb-6 mt-auto flex justify-between space-x-2 rtl:space-x-reverse">
            <Button color="minimal" onClick={handlePrevious}>
              {currentStep === 0 ? t("cancel") : t("previous")}
            </Button>
            <Button
              type="button"
              color="primary"
              onClick={handleNext}
              loading={loadingStates.creatingBooking || isVerificationCodeSending}>
              {currentStep === totalSteps - 1
                ? isInstantMeeting
                  ? t("confirm")
                  : renderConfirmNotVerifyEmailButtonCond
                  ? t("confirm")
                  : t("verify_email_email_button")
                : t("next")}
            </Button>
          </div>
        </form>
      </div>
    </FormProvider>
  );
};
