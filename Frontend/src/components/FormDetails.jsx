function FormDetails({ title, setTitle, description, setDescription }) {
  return (
    <div>
      <div className="section-title">📋 Form Details</div>

      <div className="form-group">
        <label className="form-label">Form Title</label>
        <input
          type="text"
          placeholder="e.g. Employee Onboarding Form"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
          name="form-title-field"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          placeholder="Briefly describe what this form is for..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoComplete="off"
          name="form-description-field"
        />
      </div>
    </div>
  );
}

export default FormDetails;
