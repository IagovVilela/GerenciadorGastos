import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, Lightbulb, Plus, Edit2, Trash2, DollarSign, Moon, Sun, Download, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const FinanZen = () => {
  const [transactions, setTransactions] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    type: 'income',
    date: new Date().toISOString().split('T')[0],
    category: 'vendas'
  });

  const categories = {
    income: ['vendas', 'servicos', 'investimentos', 'outros'],
    expense: ['fornecedores', 'marketing', 'salarios', 'aluguel', 'outros']
  };

  const categoryColors = {
    vendas: '#10b981', servicos: '#3b82f6', investimentos: '#8b5cf6',
    fornecedores: '#ef4444', marketing: '#f59e0b', salarios: '#ec4899',
    aluguel: '#6366f1', outros: '#64748b'
  };

  // Refs para os gráficos
  const barChartRef = useRef(null);
  const pieChartRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('finanzen_transactions');
    if (saved) {
      setTransactions(JSON.parse(saved));
    } else {
      const demo = [
        { id: 1, name: 'Venda de Produtos', value: 15000, type: 'income', date: '2025-09-15', category: 'vendas' },
        { id: 2, name: 'Prestação de Serviços', value: 8000, type: 'income', date: '2025-09-20', category: 'servicos' },
        { id: 3, name: 'Compra de Materiais', value: 12000, type: 'expense', date: '2025-09-10', category: 'fornecedores' },
        { id: 4, name: 'Campanhas Google Ads', value: 5000, type: 'expense', date: '2025-09-12', category: 'marketing' },
        { id: 5, name: 'Folha de Pagamento', value: 8000, type: 'expense', date: '2025-09-05', category: 'salarios' },
        { id: 6, name: 'Venda de Produtos', value: 18000, type: 'income', date: '2025-10-15', category: 'vendas' },
        { id: 7, name: 'Consultoria', value: 6000, type: 'income', date: '2025-10-18', category: 'servicos' },
        { id: 8, name: 'Fornecedores', value: 9000, type: 'expense', date: '2025-10-08', category: 'fornecedores' },
        { id: 9, name: 'Marketing Digital', value: 3500, type: 'expense', date: '2025-10-10', category: 'marketing' },
      ];
      setTransactions(demo);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('finanzen_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Função ajustada para agrupar por mês/ano considerando datas no formato brasileiro
  const getMonthlyData = () => {
    const monthly = {};
    transactions.forEach(t => {
      // Suporta formato 'dd/mm/yyyy' e ISO
      let month, year;
      if (/\d{2}\/\d{2}\/\d{4}/.test(t.date)) {
        const [day, mon, yr] = t.date.split('/');
        month = mon;
        year = yr.slice(2);
      } else {
        // ISO: yyyy-mm-dd
        const [yr, mon] = t.date.split('-');
        month = mon;
        year = yr.slice(2);
      }
      const key = `${month}/${year}`;
      if (!monthly[key]) {
        monthly[key] = { income: 0, expense: 0, balance: 0 };
      }
      if (t.type === 'income') {
        monthly[key].income += t.value;
      } else {
        monthly[key].expense += t.value;
      }
      monthly[key].balance = monthly[key].income - monthly[key].expense;
    });
    // Meses abreviados em português
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return Object.entries(monthly)
      .sort(([a], [b]) => {
        const [ma, ya] = a.split('/');
        const [mb, yb] = b.split('/');
        return ya === yb ? ma - mb : ya - yb;
      })
      .map(([key, data]) => {
        const [mon, yr] = key.split('/');
        return {
          month: `${meses[parseInt(mon, 10) - 1]}/${yr}`,
          monthKey: key,
          ...data
        };
      });
  };

  const getCategoryData = () => {
    const categoryTotals = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.value;
      });

    return Object.entries(categoryTotals)
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);
  };

  const getAlerts = () => {
    const monthlyData = getMonthlyData();
    const alerts = [];

    monthlyData.forEach(m => {
      if (m.balance < 0) {
        alerts.push({
          type: 'danger',
          message: `⚠️ Prejuízo em ${m.month}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.balance)}`
        });
      }
      if (m.income > 0 && (m.expense / m.income) > 0.7) {
        alerts.push({
          type: 'warning',
          message: `💡 Despesas em ${m.month} representam ${((m.expense / m.income) * 100).toFixed(0)}% da receita`
        });
      }
    });

    return alerts;
  };

  const getSuggestions = () => {
    const categoryData = getCategoryData();
    const suggestions = [];

    if (categoryData.length > 0) {
      const topCategories = categoryData.slice(0, 2);
      suggestions.push({
        icon: '💡',
        text: `Considere revisar gastos em: ${topCategories.map(c => c.category).join(', ')}`
      });
    }

    const monthlyData = getMonthlyData();
    const negativeMonths = monthlyData.filter(m => m.balance < 0);
    if (negativeMonths.length > 0) {
      suggestions.push({
        icon: '📊',
        text: `Você teve ${negativeMonths.length} mês(es) com prejuízo. Planeje melhor seu fluxo de caixa.`
      });
    }

    return suggestions;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newTransaction = {
      id: editingId || Date.now(),
      ...formData,
      value: parseFloat(formData.value)
    };

    if (editingId) {
      setTransactions(transactions.map(t => t.id === editingId ? newTransaction : t));
      setEditingId(null);
    } else {
      setTransactions([...transactions, newTransaction]);
    }

    setFormData({
      name: '',
      value: '',
      type: 'income',
      date: new Date().toISOString().split('T')[0],
      category: 'vendas'
    });
    setShowForm(false);
  };

  const handleEdit = (transaction) => {
    setFormData(transaction);
    setEditingId(transaction.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const exportCSV = () => {
    const csv = [
      ['Nome', 'Valor', 'Tipo', 'Data', 'Categoria'],
      ...filteredTransactions.map(t => [
        t.name,
        `R$ ${t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        t.type === 'income' ? 'Receita' : 'Despesa',
        t.date,
        t.category
      ])
    ].map(row => row.join(';')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finanzen_export.csv';
    a.click();
  };

  const exportPDF = async () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório Financeiro', 15, 15);
    doc.setFontSize(10);
    let y = 30;
    doc.text('Nome', 15, y);
    doc.text('Valor', 65, y);
    doc.text('Tipo', 95, y);
    doc.text('Data', 120, y);
    doc.text('Categoria', 150, y);
    y += 8;
    filteredTransactions.forEach((t) => {
      doc.text(t.name, 15, y);
      doc.text(`R$ ${t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 65, y);
      doc.text(t.type === 'income' ? 'Receita' : 'Despesa', 95, y);
      doc.text(t.date, 120, y);
      doc.text(t.category, 150, y);
      y += 8;
      if (y > 120) {
        doc.addPage();
        y = 20;
      }
    });
    // Captura os gráficos como PNG
    const addChartToPdf = async (chartRef, posY, title) => {
      if (chartRef.current) {
        const canvas = await html2canvas(chartRef.current);
        const imgData = canvas.toDataURL('image/png');
        doc.addPage();
        doc.setFontSize(14);
        doc.text(title, 15, 20);
        doc.addImage(imgData, 'PNG', 15, 30, 180, 80);
      }
    };
    await addChartToPdf(barChartRef, y, 'Evolução Mensal');
    await addChartToPdf(pieChartRef, y, 'Despesas (Gráfico de Pizza)');
    doc.save('finanzen_relatorio.pdf');
  };

  const monthlyData = getMonthlyData();
  const categoryData = getCategoryData();
  const alerts = getAlerts();
  const suggestions = getSuggestions();

  const filteredTransactions = filterCategory === 'all' 
    ? transactions 
    : transactions.filter(t => t.category === filterCategory);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.value, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.value, 0);
  const totalBalance = totalIncome - totalExpense;

  // Função para gerar dados do gráfico de pizza de despesas
  const getExpensePieData = () => {
    const expenseCategories = {};
    transactions.forEach(t => {
      if (t.type === 'expense') {
        expenseCategories[t.category] = (expenseCategories[t.category] || 0) + t.value;
      }
    });
    return Object.entries(expenseCategories).map(([cat, value]) => ({ name: cat, value }));
  };
  const pieColors = ['#ef4444', '#f59e0b', '#ec4899', '#6366f1', '#64748b', '#3b82f6', '#8b5cf6', '#10b981'];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'}`}>
      <header className={`sticky top-0 z-50 backdrop-blur-lg ${darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-200'} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-xl ${darkMode ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-gradient-to-br from-blue-600 to-purple-700'} flex items-center justify-center shadow-lg`}>
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>FinanZen</h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sua saúde financeira em tempo real</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button onClick={exportCSV} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
                <Download className="w-5 h-5" />
              </button>
              <button onClick={exportPDF} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
                <FileText className="w-5 h-5" />
              </button>
              <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}>
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`rounded-2xl p-6 shadow-xl ${darkMode ? 'bg-gradient-to-br from-green-900 to-emerald-900' : 'bg-gradient-to-br from-green-500 to-emerald-600'} text-white transform hover:scale-105 transition-transform`}>
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8" />
              <span className="text-sm font-medium opacity-90">Receitas</span>
            </div>
            <p className="text-3xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalIncome)}</p>
          </div>

          <div className={`rounded-2xl p-6 shadow-xl ${darkMode ? 'bg-gradient-to-br from-red-900 to-rose-900' : 'bg-gradient-to-br from-red-500 to-rose-600'} text-white transform hover:scale-105 transition-transform`}>
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="w-8 h-8" />
              <span className="text-sm font-medium opacity-90">Despesas</span>
            </div>
            <p className="text-3xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpense)}</p>
          </div>

          <div className={`rounded-2xl p-6 shadow-xl ${totalBalance >= 0 ? (darkMode ? 'bg-gradient-to-br from-blue-900 to-indigo-900' : 'bg-gradient-to-br from-blue-500 to-indigo-600') : (darkMode ? 'bg-gradient-to-br from-orange-900 to-red-900' : 'bg-gradient-to-br from-orange-500 to-red-600')} text-white transform hover:scale-105 transition-transform`}>
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8" />
              <span className="text-sm font-medium opacity-90">Saldo</span>
            </div>
            <p className="text-3xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBalance)}</p>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="mb-8 space-y-3">
            {alerts.map((alert, i) => (
              <div key={i} className={`rounded-xl p-4 flex items-start space-x-3 ${alert.type === 'danger' ? (darkMode ? 'bg-red-900/50 border-red-700' : 'bg-red-50 border-red-200') : (darkMode ? 'bg-yellow-900/50 border-yellow-700' : 'bg-yellow-50 border-yellow-200')} border`}>
                <AlertCircle className={`w-5 h-5 mt-0.5 ${alert.type === 'danger' ? 'text-red-600' : 'text-yellow-600'}`} />
                <p className={`${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{alert.message}</p>
              </div>
            ))}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className={`rounded-2xl p-6 mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-lg`}>
            <div className="flex items-center space-x-2 mb-4">
              <Lightbulb className={`w-6 h-6 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Sugestões Inteligentes</h2>
            </div>
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div key={i} className={`flex items-start space-x-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-blue-50'}`}>
                  <span className="text-2xl">{s.icon}</span>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Painel de Evolução Mensal */}
        <div ref={barChartRef} className="w-full max-w-4xl mx-auto my-8 p-8 bg-white rounded-2xl shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Evolução Mensal</h2>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={getMonthlyData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: 'none', borderRadius: '8px', color: '#000' }} />
              <Legend />
              <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expense" name="Despesas" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Painel de Despesas (Gráfico de Pizza) */}
          <div ref={pieChartRef} className="w-full max-w-2xl mx-auto my-8 p-6 bg-white rounded-2xl shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Despesas (Gráfico de Pizza)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={getExpensePieData()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label>
                  {getExpensePieData().map((entry, index) => (
                    <Cell key={index} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff', border: 'none', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
            <Plus className="w-5 h-5" />
            <span>Nova Transação</span>
          </button>
          
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={`px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}>
            <option value="all">Todas as categorias</option>
            {Object.values(categories).flat().map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {showForm && (
          <div className={`rounded-2xl p-6 mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-lg`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Nome da transação" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={`px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`} />
              
              <input type="number" placeholder="Valor" value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} step="0.01" className={`px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`} />
              
              <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value, category: categories[e.target.value][0]})} className={`px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}>
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
              
              <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className={`px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`}>
                {categories[formData.type].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              
              <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className={`px-4 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'}`} />
              
              <div className="flex space-x-2">
                <button onClick={handleSubmit} className="flex-1 px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                  {editingId ? 'Atualizar' : 'Adicionar'}
                </button>
                <button onClick={() => { setShowForm(false); setEditingId(null); }} className={`px-6 py-2 rounded-lg font-semibold ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`rounded-2xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border shadow-lg overflow-hidden`}>
          <div className="p-6">
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Transações Recentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nome</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Valor</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tipo</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Data</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Categoria</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Ações</th>
                </tr>
              </thead>
              <tbody className={`${darkMode ? 'divide-gray-700' : 'divide-gray-200'} divide-y`}>
                {filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => (
                  <tr key={t.id} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}>
                    <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>{t.name}</td>
                    <td className={`px-6 py-4 whitespace-nowrap font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.value)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.type === 'income' ? (darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800') : (darkMode ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800')}`}>
                        {t.type === 'income' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button onClick={() => handleEdit(t)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-600 text-blue-400' : 'hover:bg-blue-50 text-blue-600'}`}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-gray-600 text-red-400' : 'hover:bg-red-50 text-red-600'}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className={`mt-16 py-8 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            © 2025 FinanZen - Fintech fictícia para demonstração
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FinanZen;
