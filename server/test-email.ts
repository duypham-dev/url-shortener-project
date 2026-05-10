import nodemailer from 'nodemailer';

async function main() {
  console.log('Creating Ethereal test account...');
  // Ethereal là một dịch vụ SMTP giả lập chuyên dùng để test của Nodemailer
  const testAccount = await nodemailer.createTestAccount();

  console.log('Test account created:');
  console.log('User:', testAccount.user);
  console.log('Pass:', testAccount.pass);

  // Khởi tạo transporter với thông tin từ Ethereal
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  console.log('\nSending test email...');
  
  // Gửi email cấu hình mẫu
  const info = await transporter.sendMail({
    from: '"Dự án ShortLink " <test@shortlink.com>', 
    to: "nguoinhan@example.com", // Đổi thành email của bạn nếu dùng SMTP thật
    subject: "Test Nodemailer ✔", 
    text: "Xin chào, đây là email test từ Nodemailer!", 
    html: "<b>Xin chào,</b><br><p>Đây là email test từ Nodemailer!</p>", 
  });

  console.log('\n--- KẾT QUẢ ---');
  console.log("Message sent ID: %s", info.messageId);
  // Xem trước email trực tiếp trên web Ethereal mà không cần gửi đến email thật
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

main().catch(console.error);
