"use client";

import { useEffect, useState } from "react";

export type SpotFormValues = {
  name: string;
  description: string;
  location: string;
  date: string;
};

export type SpotSubmitPayload = SpotFormValues & {
  id?: string;
};

type SpotFormProps = {
  mode?: "create" | "edit";
  initialValues?: Partial<SpotFormValues>;
  spotId?: string;
  onSubmit: (payload: SpotSubmitPayload) => Promise<void> | void;
  onCancel?: () => void;
  submitLabel?: string;
};

const defaultValues: SpotFormValues = {
  name: "",
  description: "",
  location: "",
  date: "",
};

export function SpotForm({
  mode = "create",
  initialValues,
  spotId,
  onSubmit,
  onCancel,
  submitLabel,
}: SpotFormProps) {
  const [formValues, setFormValues] = useState<SpotFormValues>(() => ({
    name: initialValues?.name ?? defaultValues.name,
    description: initialValues?.description ?? defaultValues.description,
    location: initialValues?.location ?? defaultValues.location,
    date: initialValues?.date ?? defaultValues.date,
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormValues({
      name: initialValues?.name ?? defaultValues.name,
      description: initialValues?.description ?? defaultValues.description,
      location: initialValues?.location ?? defaultValues.location,
      date: initialValues?.date ?? defaultValues.date,
    });
  }, [
    mode,
    initialValues?.name,
    initialValues?.description,
    initialValues?.location,
    initialValues?.date,
  ]);

  const isEditMode = mode === "edit";
  const resolvedSubmitLabel =
    submitLabel ?? (isEditMode ? "スポットを更新" : "スポットを追加");

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isEditMode && !spotId) {
      setErrorMessage("スポットIDが指定されていないため、編集できません。");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({ ...formValues, id: spotId });

      if (!isEditMode) {
        setFormValues(defaultValues);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "スポットの保存に失敗しました。もう一度お試しください。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="spot-form" onSubmit={handleSubmit}>
      <fieldset disabled={isSubmitting} className="spot-form__fieldset">
        <legend className="spot-form__legend">
          {isEditMode ? "スポットを編集" : "スポットを作成"}
        </legend>

        {errorMessage ? <p className="spot-form__error">{errorMessage}</p> : null}

        <label className="spot-form__label">
          スポット名
          <input
            type="text"
            name="name"
            value={formValues.name}
            onChange={handleChange}
            required
            className="spot-form__input"
            placeholder="例: 通天閣"
          />
        </label>

        <label className="spot-form__label">
          詳細
          <textarea
            name="description"
            value={formValues.description}
            onChange={handleChange}
            className="spot-form__textarea"
            placeholder="見どころやメモを記入"
            rows={4}
          />
        </label>

        <label className="spot-form__label">
          場所
          <input
            type="text"
            name="location"
            value={formValues.location}
            onChange={handleChange}
            required
            className="spot-form__input"
            placeholder="例: 大阪府大阪市浪速区"
          />
        </label>

        <label className="spot-form__label">
          日時
          <input
            type="datetime-local"
            name="date"
            value={formValues.date}
            onChange={handleChange}
            required
            className="spot-form__input"
          />
        </label>

        <div className="spot-form__actions">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="spot-form__button spot-form__button--secondary"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
          ) : null}
          <button
            type="submit"
            className="spot-form__button spot-form__button--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "保存中..." : resolvedSubmitLabel}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
