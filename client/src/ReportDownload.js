import React, { useState } from 'react';
import {
  Card, CardHeader, CardContent, Button, Box, TextField, Typography, Alert,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ExcelJS from 'exceljs';

export default function ReportDownload({ apiUrl, token }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Convert base64 to Uint8Array
  const base64ToArrayBuffer = (base64) => {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (err) {
      console.error('Base64 conversion error:', err);
      return null;
    }
  };

  const downloadReport = async (type) => {
    setError('');
    setSuccess('');

    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setLoading(true);
    try {
      const url = `${apiUrl}/reports/${type}?startDate=${startDate}&endDate=${endDate}`;
      console.log(`🔍 Fetching: ${url}`);

      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.details || `HTTP ${res.status}`);
      }

      let data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }

      if (data.length === 0) {
        setError('No records found for the selected date range');
        setLoading(false);
        return;
      }

      console.log(`✅ Fetched ${data.length} records`);

      // Count valid photos
      let validPhotos = 0;
      data.forEach((row) => {
        // Check if photo exists and is not empty
        if (row.photo && typeof row.photo === 'string' && row.photo.length > 50) {
          validPhotos++;
        }
      });

      console.log(`📸 Records with valid photos: ${validPhotos}`);

      // Create workbook
      const workbook = new ExcelJS.Workbook();

      // Split data into chunks
      const chunkSize = 50;
      let sheetNumber = 1;
      let totalPhotos = 0;

      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const sheetName = data.length > chunkSize ? `${type}_${sheetNumber}` : type;
        const worksheet = workbook.addWorksheet(sheetName);

        // Add headers
        const headers = Object.keys(chunk[0] || {});
        const headerRow = worksheet.addRow(headers);

        // Style headers
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF8A00' },
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };

        let photoCount = 0;

        // Add data rows
        for (let rowIndex = 0; rowIndex < chunk.length; rowIndex++) {
          const row = chunk[rowIndex];
          const rowData = [];
          const hasPhoto = row.photo && typeof row.photo === 'string' && row.photo.length > 50;

          for (const header of headers) {
            if (header === 'photo') {
              rowData.push(hasPhoto ? '✓ Photo' : '✗ No Photo');
            } else {
              let value = row[header];
              if (typeof value === 'string' && value.length > 500) {
                value = value.substring(0, 500) + '...';
              }
              rowData.push(value);
            }
          }

          const excelRow = worksheet.addRow(rowData);

          // Try to embed photo
          if (hasPhoto && photoCount < 10) {
            try {
              const photoIndex = headers.indexOf('photo');
              if (photoIndex !== -1) {
                let base64Data = row.photo;

                // If it's a URL (Cloudinary), fetch and convert to base64
                if (base64Data.startsWith('http')) {
                  try {
                    const imgRes = await fetch(base64Data);
                    const imgBlob = await imgRes.blob();
                    base64Data = await new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const result = reader.result;
                        resolve(result.includes(',') ? result.split(',')[1] : result);
                      };
                      reader.readAsDataURL(imgBlob);
                    });
                  } catch (fetchErr) {
                    console.warn('Failed to fetch photo URL:', fetchErr.message);
                    base64Data = null;
                  }
                } else if (base64Data.includes(',')) {
                  // Remove data URL prefix if present
                  base64Data = base64Data.split(',')[1];
                }

                if (!base64Data) throw new Error('No base64 data');

                console.log(`🖼️ Processing photo ${photoCount + 1}, size: ${base64Data.length}`);

                // Convert to array buffer
                const imageBuffer = base64ToArrayBuffer(base64Data);

                if (imageBuffer && imageBuffer.length > 0) {
                  // Detect image type by checking magic bytes
                  let extension = 'jpeg';
                  if (base64Data.startsWith('iVBORw0K')) {
                    extension = 'png';
                  } else if (base64Data.startsWith('R0lGODlh')) {
                    extension = 'gif';
                  }

                  console.log(`📸 Adding photo ${photoCount + 1} - Type: ${extension}`);

                  // Add image
                  const imageId = workbook.addImage({
                    buffer: imageBuffer,
                    extension: extension,
                  });

                  worksheet.addImage(imageId, {
                    tl: { col: photoIndex, row: excelRow.number - 1 },
                    ext: { width: 100, height: 100 },
                  });

                  excelRow.height = 100;
                  photoCount++;
                  totalPhotos++;
                  console.log(`✅ Photo ${photoCount} embedded!`);
                } else {
                  console.warn(`⚠️ Failed to convert photo buffer`);
                }
              }
            } catch (imgErr) {
              console.warn(`⚠️ Photo error:`, imgErr.message);
            }
          }

          // Alternate row colors
          if (rowIndex % 2 === 0) {
            excelRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F2F2' },
            };
          }
        }

        // Set column widths
        headers.forEach((header, index) => {
          const column = worksheet.getColumn(index + 1);
          column.width = header === 'photo' ? 25 : Math.min(30, Math.max(12, header.length));
          column.alignment = { wrapText: true, vertical: 'center' };
        });

        sheetNumber++;
      }

      // Write file
      const fileName = `${type}_report_${startDate}_to_${endDate}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      setSuccess(`✅ Report downloaded successfully!\n📊 ${data.length} records\n📸 ${totalPhotos} photos embedded`);
      setLoading(false);

    } catch (err) {
      console.error('❌ Download error:', err);
      setError(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <Card sx={{ boxShadow: 3 }}>
      <CardHeader 
        title="📊 Download Reports" 
        subheader="Select date range and download data with photos"
        sx={{ backgroundColor: '#0c1530', borderBottom: '2px solid #ff8a00' }}
      />
      <CardContent sx={{ pt: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{success}</Alert>}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            sx={{ backgroundColor: '#ff8a00', '&:hover': { backgroundColor: '#e67e00' } }}
            onClick={() => downloadReport('visitors')}
            disabled={loading}
            fullWidth
          >
            {loading ? '⏳ Downloading...' : '📥 Download Visitors'}
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            sx={{ backgroundColor: '#ff8a00', '&:hover': { backgroundColor: '#e67e00' } }}
            onClick={() => downloadReport('consignments')}
            disabled={loading}
            fullWidth
          >
            {loading ? '⏳ Downloading...' : '📥 Download Consignments'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}