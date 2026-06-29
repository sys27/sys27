---
title: .NET SSL certificates on Linux
description: This article explains how to create your CA, certificates, and configure .NET to use them for HTTPS/SSL.
tags: dotnet, asp.net, ssl, linux, archlinux
date: 2024-05-21
---

Hello there.

In this article, I will talk about .NET and SSL certificates and of course, .NET supports HTTPS out of box. .NET SDK can generate self-signed certificates, and even default templates have HTTPS enabled by default. So, you as a developer don't need to do anything, just create a project from a template and you can run your service with HTTPS support on a local machine.

But here is the catch. While HTTPS is supported on Windows, Mac, and Linux. .NET SDK can generate and configure certificates only on Windows and Mac by using this command:

```bash
dotnet dev-certs https --trust
```

This command will generate all required certificates and put them into "trusted system storage". A place where all certificates are stored and if the certificate is there, anything in the system will trust it.

Linux requires manual configuration and it depends on the version of OS. For some distributions, you just need to use `dotnet dev-certs https` to generate certificates and use another command to trust it. On other distributions, you need to do everything by yourself. And this article is exactly about this case.

### HTTPS/SSL/TLS

First of all, what is an SSL certificate? To answer it, we need to start with asymmetric encryption - it's a type of encryption based on algorithms that use two keys. The first one is called _private_ and well we need to keep it private. The second one is _public_ which we can share with everyone. We can use this combination of keys to "sign" documents/files/etc to confirm that it wasn't changed by any third party. In this case, the private key is used to encrypt data and because it is private we are sure that no one "changed" this data. While the public key is used to decrypt data. So everyone can read data but can't modify it.

Based on these properties, we can "sign" any data/document/file. Let's assume we have two users: Alice and Bob. Alice wants to send a file to Bob. Bob needs to get the file and confirm that it is from Alice and unchanged. Alice generates a key pair and shares the public key, then she calculates a hash of the file and encrypts this hash using the private key, this encrypted hash is called a signature. Bob receives the file and the signature. Bob is sure the signature wasn't changed because it was encrypted by the private key. But he still has to check the file. He has to calculate a hash of the received file, decrypt the received signature to get the original hash, and compare these two hashes: the original from the signature and the calculated one. If they are equal, then the file is original.

This process is pretty secure as long the private key is _private_. It doesn't protect the content of the file but rather its authenticity. But it has one drawback, you need to share your public key. To do it safely, you need to use key exchange algorithms with each peer. It is inconvenient. To solve this "inconvenience", we can introduce a third-party service which is trusted by both sides: Alice and Bob. The third-party service is responsible for securely storing and providing public keys. So, each time Bob wants to check a file from Alice, he can obtain the correct public key from the third-party service.

Back to SSL certificates. SSL certificate consists of two things: a key pair (private/public) and some data (domain, organization, issue/valid time, etc) signed by a public key. I think you can see similarities with previous paragraphs but you still need to solve a distribution problem of your certificates (public key and data) to end users. You can't just send a certificate to end users, they can't trust it because it could be "modified" in the middle of a transition. You need some reliable and safe way to host your certificate. Certificate Authority (CA) is responsible for that. CA is a thirt-party service which is trusted by every peer. When a new certificate is created it is signed by CA, so end users can validate this signature and confirm this certificate is authentic, and establish a TLS connection.

### Generate certificates by using OpenSSL

When you create a certificate for local development, it is not signed by a trusted CA but instead by your own authority. So, the system knows nothing about it and doesn't trust it by default. So, you need to create your own CA, a certificate, and ask the system to trust it.

Create a CA certificate:
```bash
openssl genpkey -algorithm RSA -out ca.key
openssl req -x509 -key ca.key -out ca.crt -days 365 -subj "/CN=localhost/O=localhost-ca"
```

The first command generates a private key. The second command creates a certificate which is valid for 365 days. `CN` (Common Name) specifies the domain name, in our case it is `localhost`.

Create CSR (Certificate Signing Request):
```bash
openssl genpkey -algorithm RSA -out localhost.key
openssl req -new -key localhost.key -out localhost.csr -subj "/CN=localhost/O=localhost-ca"
```

Sign CSR by your CA and create SSL certificate valid for 365 days:
```bash
openssl x509 -req -in localhost.csr -days 365 -out localhost.crt \
    -CA ca.crt -CAkey ca.key -CAcreateserial \
    -extfile <(cat <<END
basicConstraints = CA:FALSE
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
subjectAltName = DNS:localhost
END
    )
```

Extensions:
- `basicConstraints = CA:FALSE` specifies that this certificate is not a CA and can't be used to sign other certificates
- `subjectKeyIdentifier = hash` adds a unique identifier for the certificate.
- `authorityKeyIdentifier = keyid,issuer` adds the identifier and issuer information of the CA.
- `subjectAltName = DNS:$domain` includes the domain name as a subject alternative name.

Export a certificate in PKCS #12 (*.pfx) format, `openssl` will ask for a password. It will be used by .NET.
```bash
openssl pkcs12 -export -out localhost.pfx -inkey localhost.key -in localhost.crt
```

Ask the system to trust your CA. Any certificate signed by this CA will be trusted:
```bash
sudo trust anchor ca.crt
```

Change the configuration of your application, and ask Kestrel to use your certificate:
```json
{
  "Kestrel": {
    "Certificates": {
      "Default": {
        "Path": "<path>/localhost.pfx",
        "Password": "<password>"
      }
    }
  }
}
```

All commands as a single scripts:
<details>
<summary>generate.sh</summary>

```bash
#!/bin/bash
org=localhost-ca
domain=localhost

openssl genpkey -algorithm RSA -out ca.key
openssl req -x509 -key ca.key -out ca.crt -days 365 -subj "/CN=$org/O=$org"

openssl genpkey -algorithm RSA -out "$domain".key
openssl req -new -key "$domain".key -out "$domain".csr -subj "/CN=$domain/O=$org"

openssl x509 -req -in "$domain".csr -days 365 -out "$domain".crt \
    -CA ca.crt -CAkey ca.key -CAcreateserial \
    -extfile <(cat <<END
basicConstraints = CA:FALSE
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
subjectAltName = DNS:$domain
END
    )

openssl pkcs12 -export -out "$domain".pfx -inkey "$domain".key -in "$domain".crt
```
</details>
