import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download } from 'lucide-react'

interface QRCodeDisplayProps {
  value: string
  size?: number
  title?: string
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ value, size = 256, title = "Code QR" }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrCodeUrl(url)
      } catch (error) {
        console.error('Error generating QR code:', error)
      }
    }

    generateQR()
  }, [value, size])

  const downloadQR = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a')
      link.href = qrCodeUrl
      link.download = `qr-code-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        {qrCodeUrl ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="border border-gray-200 rounded-lg"
              />
            </div>
            <button
              onClick={downloadQR}
              className="flex items-center justify-center space-x-2 mx-auto px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Télécharger</span>
            </button>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Présentez ce code QR à l'entrée de l'événement pour valider votre billet
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>
    </div>
  )
}

export default QRCodeDisplay