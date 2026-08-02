function FormDetails({
  title,
  setTitle,
  description,
  setDescription,
}) {
  return (
    <div>

      <h3>Form Details</h3>

      <label>Form Title</label>
      <br />

      <input
        type="text"
        placeholder="Enter Form Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <br /><br />

      <label>Description</label>
      <br />

      <textarea
        placeholder="Enter Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

    </div>
  );
}

export default FormDetails;