
# Email System Implementation Guide

## Overview
This document outlines two approaches for implementing email functionality in the website's messaging system, allowing users to send and receive emails alongside their existing chat conversations.

## Approach 1: Own Email Server Implementation

### Description
Set up a dedicated email server that creates custom email addresses for each user on your domain (e.g., `username@yourdomain.com`).

### Technical Requirements

#### Backend Infrastructure
- **Email Server Setup**: Postfix, Dovecot, or similar mail server
- **Domain Configuration**: MX records, SPF, DKIM, DMARC
- **SSL/TLS Certificates**: For secure email transmission
- **Email Storage**: IMAP/POP3 server for email storage and retrieval

#### Database Schema Extensions
```sql
-- Email accounts table
CREATE TABLE email_accounts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  email_address VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Email messages table
CREATE TABLE email_messages (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  message_id VARCHAR(255) UNIQUE, -- RFC 2822 Message-ID
  from_address VARCHAR(255) NOT NULL,
  to_addresses TEXT[], -- Array of recipient addresses
  cc_addresses TEXT[],
  bcc_addresses TEXT[],
  subject VARCHAR(500),
  body_text TEXT,
  body_html TEXT,
  attachments JSONB,
  is_sent BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  folder VARCHAR(50) DEFAULT 'inbox', -- inbox, sent, drafts, trash
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  received_at TIMESTAMP
);

-- Email threads table
CREATE TABLE email_threads (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(500),
  participants TEXT[], -- Array of email addresses
  last_message_at TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Backend Implementation
```javascript
// Email service using nodemailer with custom SMTP
import nodemailer from 'nodemailer';
import { createTransport } from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async createUserEmailAccount(userId, username) {
    const emailAddress = `${username}@${process.env.EMAIL_DOMAIN}`;
    const password = generateSecurePassword();
    
    // Create system email account via API/shell command
    await this.createSystemEmailAccount(emailAddress, password);
    
    // Store in database
    await EmailAccount.create({
      user_id: userId,
      email_address: emailAddress,
      password_hash: bcrypt.hashSync(password, 10)
    });
    
    return emailAddress;
  }

  async sendEmail(fromUserId, toAddresses, subject, body, attachments = []) {
    const fromAccount = await EmailAccount.findOne({ user_id: fromUserId });
    
    const mailOptions = {
      from: fromAccount.email_address,
      to: toAddresses.join(', '),
      subject: subject,
      text: body.text,
      html: body.html,
      attachments: attachments
    };

    const result = await this.transporter.sendMail(mailOptions);
    
    // Store in database
    await EmailMessage.create({
      user_id: fromUserId,
      message_id: result.messageId,
      from_address: fromAccount.email_address,
      to_addresses: toAddresses,
      subject: subject,
      body_text: body.text,
      body_html: body.html,
      attachments: attachments,
      is_sent: true,
      sent_at: new Date()
    });

    return result;
  }

  async receiveEmails(userId) {
    // Connect to IMAP server to fetch new emails
    const account = await EmailAccount.findOne({ user_id: userId });
    // Implementation for IMAP connection and email retrieval
  }
}
```

#### Frontend Integration
```jsx
// Email compose component
const EmailCompose = ({ onSend, onClose }) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);

  const handleSend = async () => {
    try {
      await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          to: to.split(',').map(email => email.trim()),
          subject,
          body: { text: body, html: body },
          attachments
        })
      });
      onSend();
      onClose();
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  return (
    <div className="email-compose-modal">
      <input 
        type="email" 
        placeholder="To: email@example.com"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <input 
        type="text" 
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <textarea 
        placeholder="Email body..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <button onClick={handleSend}>Send Email</button>
    </div>
  );
};
```

### Advantages
- **Full Control**: Complete control over email infrastructure
- **Custom Features**: Can implement advanced features like threading, custom filters
- **No Third-party Dependencies**: Independent of external email providers
- **Branding**: Professional email addresses with your domain

### Disadvantages
- **Complex Setup**: Requires significant server configuration and maintenance
- **Deliverability Issues**: Harder to achieve good email deliverability rates
- **Security Concerns**: Need to implement robust security measures
- **Compliance**: Must handle GDPR, CAN-SPAM, and other regulations
- **Ongoing Maintenance**: Requires continuous monitoring and updates

---

## Approach 2: Email Aliases with External Providers

### Description
Create email aliases that forward to users' existing email accounts while allowing them to send emails through the platform using services like Gmail API, SendGrid, or similar providers.

### Technical Requirements

#### Database Schema Extensions
```sql
-- User email aliases table
CREATE TABLE user_email_aliases (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  alias_email VARCHAR(255) UNIQUE NOT NULL, -- user@yourdomain.com
  forwarding_email VARCHAR(255) NOT NULL, -- user's real email
  is_verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email provider connections
CREATE TABLE email_provider_connections (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  provider VARCHAR(50) NOT NULL, -- 'gmail', 'outlook', 'sendgrid'
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  provider_email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email conversations (lighter schema)
CREATE TABLE email_conversations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  thread_id VARCHAR(255), -- Provider's thread ID
  subject VARCHAR(500),
  participants TEXT[],
  last_message_at TIMESTAMP,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Backend Implementation
```javascript
// Email alias service
import { google } from 'googleapis';

class EmailAliasService {
  constructor() {
    this.gmail = google.gmail('v1');
  }

  async createEmailAlias(userId, preferredAlias) {
    const aliasEmail = `${preferredAlias}@${process.env.EMAIL_DOMAIN}`;
    
    // Create email forwarding rule (implementation depends on your email provider)
    await this.createForwardingRule(aliasEmail);
    
    // Store alias in database
    const alias = await UserEmailAlias.create({
      user_id: userId,
      alias_email: aliasEmail,
      forwarding_email: null, // To be set when user verifies
      verification_token: generateVerificationToken()
    });

    return alias;
  }

  async connectGmailAccount(userId, authCode) {
    // Exchange auth code for tokens
    const { tokens } = await this.oauth2Client.getToken(authCode);
    
    // Get user's Gmail address
    const gmail = this.gmail;
    const auth = this.oauth2Client;
    auth.setCredentials(tokens);
    
    const profile = await gmail.users.getProfile({
      auth: auth,
      userId: 'me'
    });

    // Store connection
    await EmailProviderConnection.create({
      user_id: userId,
      provider: 'gmail',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(tokens.expiry_date),
      provider_email: profile.data.emailAddress
    });
  }

  async sendEmailViaProvider(userId, emailData) {
    const connection = await EmailProviderConnection.findOne({ 
      user_id: userId, 
      is_active: true 
    });

    if (connection.provider === 'gmail') {
      return await this.sendViaGmail(connection, emailData);
    }
    // Add other providers as needed
  }

  async sendViaGmail(connection, emailData) {
    // Refresh token if needed
    if (new Date() > connection.token_expires_at) {
      await this.refreshGmailToken(connection);
    }

    const auth = this.oauth2Client;
    auth.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token
    });

    const raw = this.createEmailRaw(emailData);
    
    const result = await this.gmail.users.messages.send({
      auth: auth,
      userId: 'me',
      requestBody: {
        raw: raw
      }
    });

    return result;
  }

  createEmailRaw(emailData) {
    const { to, subject, body, from } = emailData;
    const email = [
      `To: ${to.join(', ')}`,
      `From: ${from}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\n');

    return Buffer.from(email).toString('base64url');
  }
}
```

#### Frontend Implementation
```jsx
// Email provider connection component
const EmailProviderSetup = ({ userId }) => {
  const [providers] = useState(['gmail', 'outlook', 'yahoo']);
  
  const connectProvider = async (provider) => {
    if (provider === 'gmail') {
      // Redirect to Google OAuth
      const authUrl = `https://accounts.google.com/oauth2/auth?` +
        `client_id=${process.env.REACT_APP_GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(window.location.origin + '/auth/gmail')}&` +
        `scope=https://www.googleapis.com/auth/gmail.send&` +
        `response_type=code&` +
        `access_type=offline`;
      
      window.location.href = authUrl;
    }
  };

  return (
    <div className="email-provider-setup">
      <h3>Connect Your Email Account</h3>
      <p>Connect your existing email to send emails through your alias</p>
      {providers.map(provider => (
        <button 
          key={provider}
          onClick={() => connectProvider(provider)}
          className="provider-connect-btn"
        >
          Connect {provider}
        </button>
      ))}
    </div>
  );
};

// Email alias management
const EmailAliasManager = ({ user }) => {
  const [alias, setAlias] = useState('');
  const [userAlias, setUserAlias] = useState(null);

  const createAlias = async () => {
    try {
      const response = await fetch('/api/email/create-alias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ alias })
      });
      
      const data = await response.json();
      setUserAlias(data.alias);
    } catch (error) {
      console.error('Error creating alias:', error);
    }
  };

  return (
    <div className="email-alias-manager">
      {!userAlias ? (
        <div>
          <input 
            type="text" 
            placeholder="Choose your email alias"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
          />
          <span>@yourdomain.com</span>
          <button onClick={createAlias}>Create Alias</button>
        </div>
      ) : (
        <div>
          <p>Your email alias: <strong>{userAlias.alias_email}</strong></p>
          <p>Status: {userAlias.is_verified ? 'Verified' : 'Pending verification'}</p>
        </div>
      )}
    </div>
  );
};
```

### Advantages
- **Easier Setup**: Much simpler to implement and maintain
- **Better Deliverability**: Leverages established email providers' reputation
- **User Familiarity**: Users can use their existing email clients
- **Lower Maintenance**: Minimal server-side email infrastructure needed
- **Security**: Leverages provider security measures

### Disadvantages
- **Provider Dependencies**: Relies on third-party email services
- **Limited Control**: Less control over email features and customization
- **API Limits**: Subject to provider API rate limits and policies
- **Cost**: May incur costs based on email volume
- **Complex OAuth**: Managing multiple provider authentications

---

## Implementation Decision Matrix

| Factor | Own Server | Email Aliases |
|--------|------------|---------------|
| Setup Complexity | High | Medium |
| Maintenance Effort | High | Low |
| Initial Cost | High | Low |
| Ongoing Cost | Medium | Variable |
| Control Level | Full | Limited |
| Deliverability | Challenging | Good |
| Scalability | Manual | Automatic |
| Security Responsibility | Full | Shared |

## Recommended Implementation Phases

### Phase 1: MVP with Aliases
1. Implement email alias creation
2. Basic Gmail API integration
3. Simple email sending interface
4. Email forwarding setup

### Phase 2: Enhanced Features
1. Multiple provider support
2. Email threading and organization
3. Advanced compose features
4. Email search and filtering

### Phase 3: Advanced Features (Optional)
1. Email templates
2. Scheduled sending
3. Email analytics
4. Integration with existing messaging system

## Security Considerations

### For Both Approaches
- **Data Encryption**: Encrypt email content at rest
- **Access Control**: Proper authentication and authorization
- **Audit Logging**: Track email access and modifications
- **Privacy Compliance**: GDPR, CCPA compliance
- **Rate Limiting**: Prevent spam and abuse

### Own Server Specific
- **Server Hardening**: Secure mail server configuration
- **Anti-spam Measures**: Implement spam filtering
- **Backup Strategy**: Regular email backups
- **SSL/TLS**: Proper certificate management

### Email Aliases Specific
- **Token Security**: Secure storage of OAuth tokens
- **Scope Limitation**: Minimal required permissions
- **Token Rotation**: Regular token refresh
- **Provider Compliance**: Follow provider guidelines

## Future Considerations

1. **Email Analytics**: Track open rates, click rates
2. **Email Marketing**: Newsletter capabilities
3. **Advanced Filtering**: Smart categorization
4. **Mobile Apps**: Native email support
5. **Third-party Integrations**: CRM, marketing tools

This documentation provides a comprehensive guide for both email implementation approaches, allowing for informed decision-making based on specific requirements, resources, and technical capabilities.
