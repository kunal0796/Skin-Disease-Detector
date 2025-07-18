import React, { useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./style.css";

const ScanPage = () => {
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [prediction, setPrediction] = useState("");
  const [confidence, setConfidence] = useState("");
  const [severity, setSeverity] = useState("");
  const [explanation, setExplanation] = useState("");
  const [typedExplanation, setTypedExplanation] = useState("");
  const [location, setLocation] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapKey, setMapKey] = useState("");
  const [reportHistory, setReportHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/api/get-map-key")
      .then((res) => res.json())
      .then((data) => setMapKey(data.key))
      .catch((err) => console.error("Map key fetch error:", err));
  }, []);

  useEffect(() => {
    if (!explanation) return;
    let i = 0;
    setTypedExplanation("");
    const interval = setInterval(() => {
      setTypedExplanation((prev) => prev + explanation.charAt(i));
      i++;
      if (i >= explanation.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [explanation]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCameraClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = handleImageChange;
    input.click();
  };

  const handleAnalyze = async () => {
    if (!imageFile) return alert("Please upload an image first.");
    setLoading(true);
    setPrediction("");
    setConfidence("");
    setSeverity("");
    setExplanation("");
    setTypedExplanation("");
    setDoctors([]);
    setShowHistory(false);

    try {
      const formData = new FormData();
      formData.append("file", imageFile);

      const res = await fetch("http://localhost:5000/api/predict", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await res.json();
      setPrediction(data.prediction);
      setConfidence(data.confidence);
      setSeverity(data.severity);
      setImagePreview(http://localhost:5000/${data.path});

      const explainRes = await fetch("http://localhost:5000/api/explain-disease", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition: data.prediction, severity: data.severity }),
      });
      const explainData = await explainRes.json();
      setExplanation(explainData.explanation || "No explanation available.");

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ lat: latitude, lon: longitude });

          const doctorRes = await fetch("http://localhost:5000/api/search-doctors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat: latitude, lon: longitude }),
          });
          const docData = await doctorRes.json();
          setDoctors(docData.doctors || []);
          setLoading(false);
        },
        () => {
          alert("Location permission denied.");
          setLoading(false);
        }
      );
    } catch (err) {
      console.error("Error:", err);
      setLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (!prediction || !confidence || !imagePreview) {
      alert("No report data to save.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/save-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prediction,
          confidence,
          image_path: imagePreview,
        }),
      });
      const data = await res.json();
      alert(data.message || "Report saved.");
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving report.");
    }
  };

  const handleViewReports = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/analysis-history", {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setReportHistory(data.history || []);
        setShowHistory(true);
      } else {
        alert(data.error || "Failed to load history");
      }
    } catch (err) {
      console.error("History fetch error:", err);
      alert("Error fetching past reports.");
    }
  };

  const downloadReport = async () => {
    const element = document.getElementById("report-content");
    if (!element) {
      alert("Nothing to export.");
      return;
    }
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(VedaralaAI_Report_${Date.now()}.pdf);
  };

  return (
    <div className="page-wrapper fade-in">
      <header className="homepage-header">
        <div className="container nav">
          <div className="logo">VedaralaAI</div>
          <nav className="nav-links">
            <a href="/home">Home</a>
            <a href="/about">About Us</a>
            <a href="/scan" className="active-link">Scan</a>
            <a href="/resources">Resources</a>
            <a href="/contact">Contact</a>
          </nav>
        </div>
      </header>

      <main className="content">
        <section className="diagnosis-section">
          <h2>📷 Upload or Scan Skin Image</h2>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          <div style={{ marginTop: "10px" }}>
            <button className="secondary-btn" onClick={handleCameraClick}>📷 Use Camera</button>
            <button className="primary-btn" onClick={handleAnalyze} disabled={loading}>
              {loading ? <span className="loader"></span> : "🔍 Analyze"}
            </button>
          </div>

          {imagePreview && (
            <>
              <h3 style={{ marginTop: "30px" }}>Preview:</h3>
              <img src={imagePreview} alt="preview" style={{ width: "250px", borderRadius: "12px" }} />
            </>
          )}

          {prediction && (
            <div id="report-content">
              <div className="terminal-box fade-in">
                <p>🧠 <strong>Prediction:</strong> <span style={{ color: "#00f5d4" }}>{prediction}</span></p>
                <p>📊 <strong>Confidence:</strong> <span style={{ color: "#00f5d4" }}>{confidence}</span></p>
                <p>⚠ <strong>Severity:</strong> <span style={{ color: "orange" }}>{severity}</span></p>
              </div>

              {typedExplanation && (
                <div className="terminal-box fade-in">
                  <p>💡 <strong>Condition Info</strong></p>
                  <p style={{ marginTop: "10px", whiteSpace: "pre-wrap" }}>{typedExplanation}</p>
                </div>
              )}

              {imagePreview && (
                <div style={{ marginTop: "15px", textAlign: "center" }}>
                  <img src={imagePreview} alt="report" style={{ width: "200px", borderRadius: "10px" }} />
                </div>
              )}
            </div>
          )}

          {doctors.length > 0 && (
            <div className="terminal-box fade-in">
              <p>🏥 <strong>Nearby Skin Specialists</strong></p>
              <ul style={{ marginTop: "10px", listStyle: "none", padding: 0 }}>
                {doctors.map((doc, index) => (
                  <li key={index}>
                    <strong>{doc.name}</strong> — {doc.address || "No address"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {location && mapKey && (
            <div className="map-container fade-in">
              <p>🗺 <strong>Location Map</strong></p>
              <iframe
                title="Nearby Dermatologists"
                width="100%"
                height="300"
                style={{ border: "2px solid #00f5d4", borderRadius: "10px" }}
                loading="lazy"
                allowFullScreen
                src={https://www.google.com/maps/embed/v1/search?key=${mapKey}&q=dermatologist&center=${location.lat},${location.lon}&zoom=13}
              ></iframe>
            </div>
          )}

          <div style={{ marginTop: "30px" }}>
            <button className="secondary-btn" onClick={handleSaveReport} disabled={!prediction}>💾 Save Report</button>
            <button className="primary-btn" style={{ marginLeft: "1rem" }} onClick={handleViewReports}>📂 View Past Reports</button>
            <button className="secondary-btn" style={{ marginLeft: "1rem" }} onClick={downloadReport} disabled={!prediction}>📄 Download PDF</button>
          </div>

          {showHistory && reportHistory.length > 0 && (
            <div className="terminal-box fade-in" style={{ marginTop: "20px" }}>
              <p>📜 <strong>Past Reports</strong></p>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {reportHistory.map((report, idx) => (
                  <li key={idx} style={{ marginBottom: "10px" }}>
                    <strong>{report.prediction}</strong> ({report.confidence}%)<br />
                    <small>{new Date(report.created_at).toLocaleString()}</small><br />
                    <img
                      src={http://localhost:5000/${report.image_path}}
                      alt="report"
                      style={{ width: "150px", borderRadius: "10px", marginTop: "5px" }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>

      <footer className="homepage-footer">
        <p>© 2025 VedaralaAI | Empowering Skin Health with AI</p>
      </footer>
    </div>
  );
};

export default ScanPage;