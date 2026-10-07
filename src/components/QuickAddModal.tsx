'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  TextInput,
  Select,
  SelectItem,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Button,
  InlineNotification,
  Loading,
  Tag,
} from '@carbon/react';
import {
  Microphone,
  MicrophoneFilled,
  Camera,
  Send,
  Add,
  Money,
} from '@carbon/icons-react';
import { parseNaturalLanguageInput, ParsedTransaction } from '@/lib/nlParser';
import { formatINR } from '@/lib/formatters';

interface QuickAddModalProps {
  open: boolean;
  onRequestClose: () => void;
  onSuccess: () => void;
}

export default function QuickAddModal({ open, onRequestClose, onSuccess }: QuickAddModalProps) {
  const [nlpText, setNlpText] = useState('');
  const [liveParsed, setLiveParsed] = useState<ParsedTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  // Manual Form States
  const [manualAmount, setManualAmount] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualType, setManualType] = useState('EXPENSE');
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedAcc, setSelectedAcc] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      fetchMetadata();
      setErrorMsg(null);
    }
  }, [open]);

  useEffect(() => {
    if (nlpText.trim()) {
      const parsed = parseNaturalLanguageInput(nlpText);
      setLiveParsed(parsed);
    } else {
      setLiveParsed(null);
    }
  }, [nlpText]);

  const fetchMetadata = async () => {
    try {
      const [catRes, accRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/accounts'),
      ]);
      const cats = await catRes.json();
      const accs = await accRes.json();
      setCategories(cats.categories || []);
      setAccounts(accs.accounts || []);
      if (cats.categories?.length > 0) setSelectedCat(cats.categories[0].id);
      if (accs.accounts?.length > 0) setSelectedAcc(accs.accounts[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  // Voice speech-to-text
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg('Speech recognition is not supported in this browser. Please use Chrome/Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNlpText(transcript);
      setIsListening(false);
    };

    recognition.onerror = (err: any) => {
      console.error('Speech error', err);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // OCR Bill Scanner with Tesseract.js (client-side dynamic import)
  const handleBillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setErrorMsg(null);

    try {
      const Tesseract = await import('tesseract.js');
      const { data } = await Tesseract.recognize(file, 'eng', {
        logger: () => {},
      });

      const ocrRes = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.text }),
      });

      const json = await ocrRes.json();

      // If the image is a multi-row salary planning sheet / table
      if (json.tableRows && json.tableRows.length > 1) {
        const importRes = await fetch('/api/salary-planner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batch-import-allocations',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear(),
            rows: json.tableRows,
          }),
        });

        if (importRes.ok) {
          onSuccess();
          onRequestClose();
          window.location.href = '/salary-planner';
          return;
        }
      }

      if (json.extractedAmount) {
        setNlpText(`${json.extractedAmount} ${json.vendorName || 'Bill'}`);
      } else {
        setNlpText(data.text.slice(0, 100));
      }
    } catch (err: any) {
      setErrorMsg('Failed to parse bill image. Please enter manually.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleNlpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpText.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: nlpText,
          source: isListening ? 'VOICE' : ocrLoading ? 'OCR_BILL' : 'NLP_TEXT',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add entry');
      }

      setNlpText('');
      setLiveParsed(null);
      onSuccess();
      onRequestClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAmount || !manualDesc) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: manualAmount,
          description: manualDesc,
          type: manualType,
          categoryId: selectedCat,
          fromAccountId: selectedAcc,
          source: 'MANUAL',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setManualAmount('');
      setManualDesc('');
      onSuccess();
      onRequestClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      modalHeading="Quick Add Transaction"
      passiveModal
      onRequestClose={onRequestClose}
      hasScrollingContent={false}
      size="md"
    >
      <div className="p-1">
        {errorMsg && (
          <InlineNotification
            kind="error"
            title="Notice: "
            subtitle={errorMsg}
            className="mb-4 w-full"
            onCloseButtonClick={() => setErrorMsg(null)}
          />
        )}

        <Tabs>
          <TabList aria-label="Transaction Entry Mode" fullWidth>
            <Tab>⚡ Fast AI & Voice</Tab>
            <Tab>📝 Manual Form</Tab>
          </TabList>

          <TabPanels>
            {/* FAST NLP / VOICE / OCR TAB */}
            <TabPanel>
              <form onSubmit={handleNlpSubmit} className="space-y-4 pt-4">
                <div className="relative flex items-center">
                  <TextInput
                    id="nlp-input"
                    labelText="Type or Speak (e.g. '450 swiggy dinner hdfc' or '1200 petrol')"
                    placeholder="450 swiggy dinner hdfc"
                    value={nlpText}
                    onChange={(e) => setNlpText(e.target.value)}
                    autoFocus
                    className="w-full"
                  />
                </div>

                {/* Live parsed badges */}
                {liveParsed && liveParsed.amount && (
                  <div className="p-3 bg-gray-100 rounded border border-gray-200 text-sm space-y-2">
                    <div className="font-semibold text-gray-700 flex items-center justify-between">
                      <span>Detected Intent:</span>
                      <span className="text-blue-600 font-mono text-base">
                        {formatINR(liveParsed.amount)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Tag type={liveParsed.type === 'INCOME' ? 'green' : liveParsed.type === 'TRANSFER' ? 'purple' : 'red'}>
                        {liveParsed.type}
                      </Tag>
                      {liveParsed.categoryHint && (
                        <Tag type="blue">Category: {liveParsed.categoryHint}</Tag>
                      )}
                      {liveParsed.accountHint && (
                        <Tag type="teal">Account: {liveParsed.accountHint}</Tag>
                      )}
                      {liveParsed.description && (
                        <Tag type="cool-gray">Desc: {liveParsed.description}</Tag>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Action Buttons for Voice & OCR */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      kind={isListening ? 'danger' : 'secondary'}
                      size="md"
                      renderIcon={isListening ? MicrophoneFilled : Microphone}
                      onClick={toggleListening}
                    >
                      {isListening ? 'Listening...' : 'Speak Entry'}
                    </Button>

                    <Button
                      type="button"
                      kind="secondary"
                      size="md"
                      renderIcon={Camera}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Scan Receipt
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={handleBillUpload}
                    />
                  </div>

                  <Button
                    type="submit"
                    kind="primary"
                    size="md"
                    renderIcon={Send}
                    disabled={!nlpText.trim() || loading || ocrLoading}
                  >
                    {loading ? 'Saving...' : 'Add Instant'}
                  </Button>
                </div>

                {ocrLoading && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600 pt-2">
                    <Loading small withOverlay={false} />
                    <span>Extracting bill details with OCR...</span>
                  </div>
                )}

                <div className="text-xs text-gray-500 pt-3 border-t border-gray-200">
                  💡 <strong>Tip:</strong> Try <em>"350 uber cab"</em>, <em>"₹1400 groceries sbi"</em>, or <em>"transfer 5000 hdfc to icici"</em>.
                </div>
              </form>
            </TabPanel>

            {/* MANUAL FORM TAB */}
            <TabPanel>
              <form onSubmit={handleManualSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    id="manual-type"
                    labelText="Type"
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value)}
                  >
                    <SelectItem value="EXPENSE" text="Expense" />
                    <SelectItem value="INCOME" text="Income" />
                    <SelectItem value="TRANSFER" text="Transfer" />
                  </Select>

                  <TextInput
                    id="manual-amount"
                    labelText="Amount (₹)"
                    type="number"
                    step="0.01"
                    placeholder="450"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    required
                  />
                </div>

                <TextInput
                  id="manual-desc"
                  labelText="Description"
                  placeholder="e.g. Swiggy team dinner"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    id="manual-cat"
                    labelText="Category"
                    value={selectedCat}
                    onChange={(e) => setSelectedCat(e.target.value)}
                  >
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} text={c.name} />
                    ))}
                  </Select>

                  <Select
                    id="manual-acc"
                    labelText="Account"
                    value={selectedAcc}
                    onChange={(e) => setSelectedAcc(e.target.value)}
                  >
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id} text={a.name} />
                    ))}
                  </Select>
                </div>

                <div className="flex justify-end pt-3">
                  <Button
                    type="submit"
                    kind="primary"
                    renderIcon={Add}
                    disabled={!manualAmount || !manualDesc || loading}
                  >
                    {loading ? 'Adding...' : 'Save Transaction'}
                  </Button>
                </div>
              </form>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </Modal>
  );
}
