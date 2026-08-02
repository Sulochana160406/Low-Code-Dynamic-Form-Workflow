import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import FormDetails from "../components/FormDetails";
import QuestionBuilder from "../components/QuestionBuilder";
import QuestionList from "../components/QuestionList";

import {
  createForm,
  createField,
  createFieldOption,
  getForm,
  updateForm,
} from "../services/api";
function CreateForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState([]);

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
          label: field.field_label,
          type: field.field_type,
          required: field.required,
        }))
      );
    } catch (error) {
      console.log(error);
      alert("Error loading form");
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

    try {
      let form;

      if (id) {
        // Update Existing Form
        await updateForm(id, {
          title,
          description,
          status: "Published",
        });

        alert("Form Updated Successfully!");
        navigate("/forms-list");
        return;
      }

      // Create New Form
      form = await createForm({
        title,
        description,
      });

      // Save Questions
      for (const question of questions) {

  const savedField = await createField({
    form_id: form.id,
    field_label: question.label,
    field_type: question.type,
    required: question.required,

    min_length: null,
    max_length: null,
    min_value: null,
    max_value: null,
    allow_decimal: true,
    min_date: null,
    max_date: null,
    allowed_file_types: null,
    max_file_size: null,
    rating_scale: null,
  });

  // Save Dropdown / Multi Checkbox Options
  if (
    (question.type === "dropdown" ||
      question.type === "multi-checkbox") &&
    question.options.length > 0
  ) {

    for (const option of question.options) {

      await createFieldOption({
        field_id: savedField.data.id,
        option_value: option,
      });

    }

  }

}

      alert("Form and Questions Saved Successfully!");

      setTitle("");
      setDescription("");
      setQuestions([]);

      navigate("/forms-list");
    } catch (error) {
      console.log(error);
      alert("Error saving form");
    }
  };

  return (
  <div className="create-form-page">
    <div className="form-card">
      <h1>{id ? "✏️ Edit Form" : "📝 Create New Form"}</h1>
      <p className="subtitle">
        {id
          ? "Update your existing form"
          : "Build your custom dynamic form"}
      </p>

      <FormDetails
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
      />

      <hr />

      <QuestionBuilder
        questions={questions}
        setQuestions={setQuestions}
      />

      <hr />

      <QuestionList
        questions={questions}
      />

      <div
        style={{
          marginTop: "25px",
          textAlign: "center",
        }}
      >
        <button
          onClick={handleSubmit}
          className="submit-btn"
        >
          {id ? "Update Form" : "Create Form"}
        </button>
      </div>
    </div>
  </div>
);
}
export default CreateForm;