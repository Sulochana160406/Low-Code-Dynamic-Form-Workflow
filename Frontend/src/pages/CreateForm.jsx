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

      setQuestions(
        data.fields.map((field) => ({
          id: field.id,
          label: field.field_label,
          type: field.field_type,
          required: field.required,
          options: field.options || [],
        }))
      );

      setRules(data.conditional_rules || []);
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
  const handleAddRule = async (ruleData) => {
    try {
      const result = await createConditionalRule({ form_id: Number(id), ...ruleData });
      setRules([...rules, { id: result.data.id, ...ruleData }]);
    } catch (error) {
      console.log(error);
      alert("Error adding rule");
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await deleteConditionalRule(ruleId);
      setRules(rules.filter((r) => r.id !== ruleId));
    } catch (error) {
      console.log(error);
      alert("Error deleting rule");
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
          });

          question.id = savedField.data.id;

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

        alert("Form Updated Successfully!");
        navigate("/forms-list");
        return;
      }

      // ---------------- CREATE NEW FORM ----------------
      const form = await createForm({ title, description });

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
        });

        if (
          (question.type === "dropdown" || question.type === "multi-checkbox") &&
          question.options.length > 0
        ) {
          for (const option of question.options) {
            await createFieldOption({ field_id: savedField.data.id, option_value: option });
          }
        }
      }

      alert("Form and Questions Saved Successfully!");
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

        {id && (
          <>
            <hr />
            <div className="section-title">🔀 Conditional Rules</div>
            <p className="form-hint" style={{ marginBottom: "16px" }}>
              Control which questions show, hide, or become required based on other answers.
            </p>
            <ConditionalRuleBuilder
              questions={questions}
              rules={rules}
              onAdd={handleAddRule}
              onDelete={handleDeleteRule}
            />
          </>
        )}

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
