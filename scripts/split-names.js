const fs = require('fs');
const path = require('path');

function splitFullName(fullName) {
  if (!fullName || fullName === 'null' || fullName.trim() === '') {
    return { firstName: '', lastName: '' };
  }

  const nameParts = fullName.trim().split(/\s+/);
  
  if (nameParts.length === 1) {
    // Single name - treat as first name
    return { firstName: nameParts[0], lastName: '' };
  } else if (nameParts.length === 2) {
    // Two names - first and last
    return { firstName: nameParts[0], lastName: nameParts[1] };
  } else {
    // Multiple names - first is first name, rest is last name
    return { 
      firstName: nameParts[0], 
      lastName: nameParts.slice(1).join(' ')
    };
  }
}

function processCSV(inputPath, outputPath) {
  try {
    console.log('Reading CSV file...');
    const csvContent = fs.readFileSync(inputPath, 'utf8');
    const lines = csvContent.split('\n');
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    console.log(`Processing ${lines.length - 1} records...`);
    
    // Process header
    const header = lines[0].trim();
    const newHeader = header + ',first_name,last_name';
    
    // Process data lines
    const processedLines = [newHeader];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const parts = line.split(',');
      if (parts.length < 2) continue; // Skip malformed lines
      
      const email = parts[0];
      const fullName = parts[1];
      
      const { firstName, lastName } = splitFullName(fullName);
      
      // Escape commas in names by wrapping in quotes if needed
      const escapedFirstName = firstName.includes(',') ? `"${firstName}"` : firstName;
      const escapedLastName = lastName.includes(',') ? `"${lastName}"` : lastName;
      
      const newLine = `${email},${fullName},${escapedFirstName},${escapedLastName}`;
      processedLines.push(newLine);
    }
    
    console.log('Writing updated CSV...');
    fs.writeFileSync(outputPath, processedLines.join('\n'), 'utf8');
    
    console.log(`✅ Successfully processed CSV file!`);
    console.log(`📁 Input: ${inputPath}`);
    console.log(`📁 Output: ${outputPath}`);
    console.log(`📊 Processed ${processedLines.length - 1} records`);
    
    // Show some examples
    console.log('\n📋 Sample results:');
    console.log('Original → First Name | Last Name');
    console.log('─'.repeat(50));
    
    const sampleLines = processedLines.slice(1, 11); // Show first 10 records
    sampleLines.forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 4) {
        const original = parts[1] === 'null' ? '(null)' : parts[1];
        const firstName = parts[2] || '(empty)';
        const lastName = parts[3] || '(empty)';
        console.log(`${original.padEnd(20)} → ${firstName.padEnd(12)} | ${lastName}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error processing CSV:', error.message);
    process.exit(1);
  }
}

// Get file paths
const inputPath = '/Users/adrianhumphrey/Downloads/Supabase Snippet AI Chat Metadata from usage_logs (1).csv';
const outputPath = '/Users/adrianhumphrey/Downloads/Supabase_AI_Chat_Metadata_with_names.csv';

// Process the CSV
processCSV(inputPath, outputPath);