import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import FormDetails from "../components/FormDetails";
import QuestionBuilder from "../components/QuestionBuilder";
import QuestionList from "../components/QuestionList";
import ConditionalRuleBuilder from "../components/ConditionalRuleBuilder";

import {
  createForm,
  createField,
  createFieldOption,
  deleteField,
  reorderFields,
  getForm,
  updateForm,
  createConditionalRule,
  deleteConditionalRule,
} from "../services/api";

function CreateForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([]);
  const [rules, setRules] = useState([]);
  const [saving, setSaving] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      loadForm();
    }
  }, [id]);

  const loadForm = async () => {
    try {
      const data = await getForm(id);

      setTitle(data.title);
      setDescription(data.description);

      // Every question gets a tempId, whether it's brand-new (added just
      // now) or already saved (loaded from the backend). The rule builder
      // only ever works off tempId, so both kinds of questions look the
      // same to it.
      const loadedQuestions = data.fields.map((field) => ({
        tempId: crypto.randomUUID(),
        id: field.id,
        label: field.field_label,
        type: field.field_type,
        required: field.required,
        options: field.options || [],
        voice_enabled: field.voice_enabled || false,
      }));
      setQuestions(loadedQuestions);

      // Existing rules reference real backend field IDs. Translate those
      // to the tempIds we just assigned above, so the rule builder's
      // dropdowns (which are keyed by tempId) can show the right
      // trigger/target selected.
      const idToTempId = {};
      loadedQuestions.forEach((q) => {
        idToTempId[q.id] = q.tempId;
      });

      const loadedRules = (data.conditional_rules || []).map((r) => ({
        tempId: crypto.randomUUID(),
        db_id: r.id,
        trigger_tempId: idToTempId[r.trigger_field_id],
        operator: r.operator,
        comparison_value: r.comparison_value,
        target_tempId: idToTempId[r.target_field_id],
        action: r.action,
      }));
      setRules(loadedRules);
    } catch (error) {
      console.log(error);
      alert("Error loading form");
    }
  };

  // ---------------- DELETE QUESTION ----------------
  const handleDeleteQuestion = async (index) => {
    const question = questions[index];

    if (!window.confirm(`Delete question "${question.label}"?`)) return;

    if (question.id) {
      try {
        await deleteField(question.id);
      } catch (error) {
        console.log(error);
        alert("Error deleting question");
        return;
      }
    }

    setQuestions(questions.filter((_, i) => i !== index));

    // A rule pointing at a question that no longer exists can't be saved
    // (there'd be nothing to resolve its field ID to), so drop it too.
    setRules(
      rules.filter(
        (r) =>
          r.trigger_tempId !== question.tempId && r.target_tempId !== question.tempId
      )
    );
  };

  // ---------------- REORDER QUESTIONS ----------------
  const handleMoveUp = (index) => {
    if (index === 0) return;
    const updated = [...questions];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setQuestions(updated);
  };

  const handleMoveDown = (index) => {
    if (index === questions.length - 1) return;
    const updated = [...questions];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setQuestions(updated);
  };

  // ---------------- CONDITIONAL RULES ----------------
  // Rules are built purely on the client while the form is being edited —
  // no API call here. This is what lets rules be added on the CREATE page
  // too, before any field has a real backend ID yet. They only get sent
  // to the backend inside handleSubmit, once every question involved has
  // been saved and has a real field ID to resolve to.
  const handleAddRule = (ruleData) => {
    setRules([...rules, { tempId: crypto.randomUUID(), ...ruleData }]);
  };

  const handleDeleteRule = async (tempId) => {
    const rule = rules.find((r) => r.tempId === tempId);
    if (!rule) return;

    if (rule.db_id) {
      if (!window.confirm("Delete this saved rule?")) return;
      try {
        await deleteConditionalRule(rule.db_id);
      } catch (error) {
        console.log(error);
        alert("Error deleting rule");
        return;
      }
    }

    setRules(rules.filter((r) => r.tempId !== tempId));
  };

  // Sends every rule that hasn't been saved to the backend yet (no db_id),
  // resolving each side's tempId to the real field ID via the map built
  // during this save. Called once, after all fields for this save exist.
  const savePendingRules = async (formId, tempIdToRealId) => {
    const pending = rules.filter((r) => !r.db_id);

    for (const rule of pending) {
      const triggerFieldId = tempIdToRealId[rule.trigger_tempId];
      const targetFieldId = tempIdToRealId[rule.target_tempId];

      if (!triggerFieldId || !targetFieldId) {
        // One of the fields this rule pointed at is missing/unsaved —
        // skip rather than send a broken rule to the backend.
        continue;
      }

      await createConditionalRule({
        form_id: Number(formId),
        trigger_field_id: triggerFieldId,
        operator: rule.operator,
        comparison_value: rule.comparison_value,
        target_field_id: targetFieldId,
        action: rule.action,
      });
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("Please enter form title");
      return;
    }

    if (questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    const confirmSave = window.confirm(
      id
        ? "Are you sure you want to update this form?"
        : "Are you sure you want to create this form?"
    );

    if (!confirmSave) return;

    setSaving(true);

    try {
      if (id) {
        // ---------------- UPDATE EXISTING FORM ----------------

        await updateForm(id, { title, description });

        // Seed the map with questions that were already saved before this
        // edit session (they keep their real id — no createField call
        // needed), then fill in newly-added questions as they're created.
        const tempIdToRealId = {};
        questions.forEach((q) => {
          if (q.id) tempIdToRealId[q.tempId] = q.id;
        });

        for (const question of questions) {
          if (question.id) continue;

          const savedField = await createField({
            form_id: Number(id),
            field_label: question.label,
            field_type: question.type,
            required: question.required,
            min_length: question.min_length ?? null,
            max_length: question.max_length ?? null,
            min_value: question.min_value ?? null,
            max_value: question.max_value ?? null,
            allow_decimal: question.allow_decimal ?? true,
            min_date: question.min_date ?? null,
            max_date: question.max_date ?? null,
            allowed_file_types: question.allowed_file_types ?? null,
            max_file_size: question.max_file_size ?? null,
            rating_scale: question.rating_scale ?? null,
            voice_enabled: question.voice_enabled ?? false,
          });

          question.id = savedField.data.id;
          tempIdToRealId[question.tempId] = savedField.data.id;

          if (
            (question.type === "dropdown" || question.type === "multi-checkbox") &&
            question.options && question.options.length > 0
          ) {
            for (const option of question.options) {
              await createFieldOption({ field_id: savedField.data.id, option_value: option });
            }
          }
        }

        const orderedFields = questions
          .filter((q) => q.id)
          .map((q, index) => ({ field_id: q.id, order: index }));

        if (orderedFields.length > 0) {
          await reorderFields(id, orderedFields);
        }

        await savePendingRules(id, tempIdToRealId);

        alert("Form Updated Successfully!");
        navigate("/forms-list");
        return;
      }

      // ---------------- CREATE NEW FORM ----------------
      const form = await createForm({ title, description });
      const tempIdToRealId = {};

      for (const question of questions) {
        const savedField = await createField({
          form_id: form.id,
          field_label: question.label,
          field_type: question.type,
          required: question.required,
          min_length: question.min_length ?? null,
          max_length: question.max_length ?? null,
          min_value: question.min_value ?? null,
          max_value: question.max_value ?? null,
          allow_decimal: question.allow_decimal ?? true,
          min_date: question.min_date ?? null,
          max_date: question.max_date ?? null,
          allowed_file_types: question.allowed_file_types ?? null,
          max_file_size: question.max_file_size ?? null,
          rating_scale: question.rating_scale ?? null,
            voice_enabled: question.voice_enabled ?? false,
        });

        tempIdToRealId[question.tempId] = savedField.data.id;

        if (
          (question.type === "dropdown" || question.type === "multi-checkbox") &&
          question.options.length > 0
        ) {
          for (const option of question.options) {
            await createFieldOption({ field_id: savedField.data.id, option_value: option });
          }
        }
      }

      await savePendingRules(form.id, tempIdToRealId);

      alert("Form and Questions Saved Successfully! Now publish it from the Forms List to get a share link.");
      navigate("/forms-list");
    } catch (error) {
      console.log(error);
      alert("Error saving form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="create-form-page">
      <div className="form-card">
        <h1>{id ? "✏️ Edit Form" : "📝 Create New Form"}</h1>
        <p className="subtitle">
          {id ? "Update your existing form" : "Build your custom dynamic form"}
        </p>

        <FormDetails
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
        />

        <hr />

        <QuestionBuilder questions={questions} setQuestions={setQuestions} />

        <hr />

        <QuestionList
          questions={questions}
          onDelete={handleDeleteQuestion}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
        />

        <hr />
        <div className="section-title">🔀 Conditional Rules</div>
        <p className="form-hint" style={{ marginBottom: "16px" }}>
          Control which questions show, hide, or become required based on other answers.
          Rules are saved together with the form when you click{" "}
          {id ? "Update Form" : "Create Form"} below.
        </p>
        <ConditionalRuleBuilder
          questions={questions}
          rules={rules}
          onAdd={handleAddRule}
          onDelete={handleDeleteRule}
        />

        <div style={{ marginTop: "28px", textAlign: "center" }}>
          <button onClick={handleSubmit} className="submit-btn" disabled={saving}>
            {saving ? "Saving..." : id ? "Update Form" : "Create Form"}
          </button>
        </div>
      </div>
    </div>
  );
}
export default CreateForm;