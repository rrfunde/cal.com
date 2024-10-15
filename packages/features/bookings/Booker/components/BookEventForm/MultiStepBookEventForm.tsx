import React, { useState, useMemo, useCallback } from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert, Button, TextField } from "@calcom/ui";
import { useBookerStore } from "../../store";
import { ProgressBar } from "./ProgressBar";

const isFieldEmpty = (field) => {
  return !field.name || !field.type || (field.type === 'text' && !field.label);
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Updated getError function with more robust error handling
const getError = (formErrors, dataErrors, t) => {
  if (Array.isArray(formErrors) && formErrors.length > 0) {
    return t(formErrors[0]);
  }
  if (Array.isArray(dataErrors) && dataErrors.length > 0) {
    return t(dataErrors[0]);
  }
  if (typeof formErrors === 'string') {
    return t(formErrors);
  }
  if (typeof dataErrors === 'string') {
    return t(dataErrors);
  }
  return t("something_went_wrong");
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
                                         isPlatform = false,
                                         isVerificationCodeSending,
                                       }) => {
  const { t } = useLocale();
  const [currentStep, setCurrentStep] = useState(0);
  const [formValues, setFormValues] = useState({});
  const [fieldError, setFieldError] = useState("");

  const setBookerStoreFormValues = useBookerStore((state) => state.setFormValues);
  const timeslot = useBookerStore((state) => state.selectedTimeslot);
  const isInstantMeeting = useBookerStore((state) => state.isInstantMeeting);

  const eventType = eventQuery.data;

  const bookingFields = useMemo(() => {
    return eventType?.bookingFields?.filter(
      (field) =>
        field.name !== 'location' &&
        field.name !== 'guests' &&
        field.name !== 'rescheduleReason' &&
        field.name !== 'notes' &&
        !isFieldEmpty(field)
    ) || [];
  }, [eventType?.bookingFields]);

  const totalSteps = bookingFields.length;

  if (eventQuery.isError) return <Alert severity="warning" message={t("error_booking_event")} />;
  if (eventQuery.isPending || !eventQuery.data) return <div>Loading...</div>;
  if (!timeslot) {
    return <div>{t("timeslot_missing")}</div>;
  }

  const validateField = (field, value) => {
    if (field.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return t("required_field");
    }
    if (field.type === 'email' && value && !isValidEmail(value)) {
      return t("invalid_email");
    }
    return null;
  };

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
    setFieldError("");
  }, []);

  const handleNext = () => {
    const currentField = bookingFields[currentStep];
    const fieldValue = formValues[currentField.name] || "";
    const validationResult = validateField(currentField, fieldValue);

    if (validationResult === null) {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        setBookerStoreFormValues(formValues);
        if (renderConfirmNotVerifyEmailButtonCond) {
          onSubmit();
        } else {
          handleVerifyEmail();
        }
      }
    } else {
      setFieldError(validationResult);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setFieldError("");
    } else {
      onCancel();
    }
  };

  const currentField = bookingFields[currentStep];

  return (
    <div className="flex h-full flex-col">
      <ProgressBar
        progress={(currentStep / (totalSteps - 1)) * 100}
        currentStep={currentStep}
        totalSteps={totalSteps}
        className="mb-4"
      />
      <form className="flex h-full flex-col">
        <TextField
          label={currentField.label}
          type={currentField.type}
          placeholder={currentField.placeholder}
          name={currentField.name}
          required={currentField.required}
          value={formValues[currentField.name] || ""}
          onChange={handleInputChange}
        />
        {fieldError && (
          <Alert
            severity="error"
            message={fieldError}
            className="mt-2"
          />
        )}
        {(externalErrors.hasFormErrors || externalErrors.hasDataErrors) && (
          <Alert
            ref={errorRef}
            className="my-2"
            severity="info"
            title={rescheduleUid ? t("reschedule_fail") : t("booking_fail")}
            message={getError(externalErrors.formErrors, externalErrors.dataErrors, t)}
          />
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
  );
};
