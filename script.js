document.addEventListener('DOMContentLoaded', () => {
    
    // === ПЕРЕМЕННЫЕ ===
    let currentInput = '0';
    let expression = '';
    let resultDisplayed = false;
    let memory = 0;
    let isDegreeMode = true; // true = градусы, false = радианы
    let isFractionMode = false;
    let history = JSON.parse(localStorage.getItem('calcHistory')) || [];
    
    // === DOM ЭЛЕМЕНТЫ ===
    const expressionEl = document.getElementById('expression');
    const resultEl = document.getElementById('result');
    const displayModeEl = document.getElementById('displayMode');
    const historyListEl = document.getElementById('historyList');
    const memoryIndicatorEl = document.getElementById('memoryIndicator');
    const memoryValueEl = document.getElementById('memoryValue');
    const historyPanel = document.getElementById('historyPanel');
    const fractionModal = document.getElementById('fractionModal');
    const fracNumerator = document.getElementById('fracNumerator');
    const fracDenominator = document.getElementById('fracDenominator');
    
    // === ИНИЦИАЛИЗАЦИЯ ===
    updateDisplay();
    renderHistory();
    updateMemoryIndicator();
    
    // === ОБРАБОТКА КНОПОК ===
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            handleAction(action);
        });
    });
    
    // === ОБРАБОТКА ДЕЙСТВИЙ ===
    function handleAction(action) {
        switch(action) {
            // Цифры
            case '0': case '1': case '2': case '3': case '4':
            case '5': case '6': case '7': case '8': case '9':
            case '00':
                inputNumber(action);
                break;
            
            // Точка
            case 'dot':
                inputDot();
                break;
            
            // Операторы
            case 'add': inputOperator('+'); break;
            case 'subtract': inputOperator('-'); break;
            case 'multiply': inputOperator('*'); break;
            case 'divide': inputOperator('/'); break;
            
            // Очистка
            case 'clear': clearAll(); break;
            case 'delete': deleteLast(); break;
            
            // Равно
            case 'equals': calculate(); break;
            
            // Функции
            case 'sin': applyFunction('sin'); break;
            case 'cos': applyFunction('cos'); break;
            case 'tan': applyFunction('tan'); break;
            case 'asin': applyFunction('asin'); break;
            case 'acos': applyFunction('acos'); break;
            case 'atan': applyFunction('atan'); break;
            case 'log': applyFunction('log'); break;
            case 'ln': applyFunction('ln'); break;
            case 'sqrt': applyFunction('sqrt'); break;
            case 'cbrt': applyFunction('cbrt'); break;
            case 'pow': inputOperator('^'); break;
            case 'factorial': applyFunction('factorial'); break;
            case 'exp': applyFunction('exp'); break;
            case 'percent': applyFunction('percent'); break;
            case 'inv': applyFunction('inv'); break;
            case 'abs': applyFunction('abs'); break;
            case 'mod': inputOperator('%'); break;
            
            // Константы
            case 'pi': inputConstant(Math.PI); break;
            case 'e': inputConstant(Math.E); break;
            
            // Скобки
            case 'parenthesis': inputParenthesis(); break;
            
            // Память
            case 'mc': memoryClear(); break;
            case 'mr': memoryRecall(); break;
            case 'm+': memoryAdd(); break;
            case 'm-': memorySubtract(); break;
            
            // Дроби
            case 'frac': openFractionModal(); break;
        }
    }
    
    // === ВВОД ЧИСЕЛ ===
    function inputNumber(num) {
        if (resultDisplayed) {
            currentInput = num;
            expression = '';
            resultDisplayed = false;
        } else {
            if (currentInput === '0' && num !== '00') {
                currentInput = num;
            } else if (currentInput === '0' && num === '00') {
                return;
            } else {
                currentInput += num;
            }
        }
        updateDisplay();
    }
    
    // === ВВОД ТОЧКИ ===
    function inputDot() {
        if (resultDisplayed) {
            currentInput = '0.';
            expression = '';
            resultDisplayed = false;
        } else if (!currentInput.includes('.')) {
            currentInput += '.';
        }
        updateDisplay();
    }
    
    // === ВВОД ОПЕРАТОРА ===
    function inputOperator(op) {
        resultDisplayed = false;
        expression += currentInput + ' ' + op + ' ';
        currentInput = '0';
        updateDisplay();
    }
    
    // === ВВОД СКОБОК ===
    function inputParenthesis() {
        const openCount = (expression + currentInput).split('(').length - 1;
        const closeCount = (expression + currentInput).split(')').length - 1;
        
        if (openCount > closeCount) {
            expression += currentInput + ')';
            currentInput = '0';
        } else {
            expression += currentInput + '(';
            currentInput = '0';
        }
        resultDisplayed = false;
        updateDisplay();
    }
    
    // === ВВОД КОНСТАНТЫ ===
    function inputConstant(value) {
        if (resultDisplayed) {
            currentInput = value.toString();
            expression = '';
            resultDisplayed = false;
        } else {
            currentInput = value.toString();
        }
        updateDisplay();
    }
    
    // === ПРИМЕНЕНИЕ ФУНКЦИИ ===
    function applyFunction(func) {
        const value = parseFloat(currentInput);
        let result;
        
        try {
            switch(func) {
                case 'sin':
                    result = isDegreeMode ? Math.sin(value * Math.PI / 180) : Math.sin(value);
                    break;
                case 'cos':
                    result = isDegreeMode ? Math.cos(value * Math.PI / 180) : Math.cos(value);
                    break;
                case 'tan':
                    result = isDegreeMode ? Math.tan(value * Math.PI / 180) : Math.tan(value);
                    break;
                case 'asin':
                    result = isDegreeMode ? Math.asin(value) * 180 / Math.PI : Math.asin(value);
                    break;
                case 'acos':
                    result = isDegreeMode ? Math.acos(value) * 180 / Math.PI : Math.acos(value);
                    break;
                case 'atan':
                    result = isDegreeMode ? Math.atan(value) * 180 / Math.PI : Math.atan(value);
                    break;
                case 'log':
                    result = Math.log10(value);
                    break;
                case 'ln':
                    result = Math.log(value);
                    break;
                case 'sqrt':
                    result = Math.sqrt(value);
                    break;
                case 'cbrt':
                    result = Math.cbrt(value);
                    break;
                case 'factorial':
                    result = factorial(value);
                    break;
                case 'exp':
                    result = Math.exp(value);
                    break;
                case 'percent':
                    result = value / 100;
                    break;
                case 'inv':
                    result = 1 / value;
                    break;
                case 'abs':
                    result = Math.abs(value);
                    break;
            }
            
            if (isNaN(result) || !isFinite(result)) {
                showToast('Ошибка вычисления', 'error');
                return;
            }
            
            // Округление до 10 знаков
            result = Math.round(result * 1e10) / 1e10;
            currentInput = result.toString();
            resultDisplayed = true;
            updateDisplay();
            
        } catch (e) {
            showToast('Ошибка вычисления', 'error');
        }
    }
    
    // === ФАКТОРИАЛ ===
    function factorial(n) {
        if (n < 0) return NaN;
        if (n === 0 || n === 1) return 1;
        if (n > 170) return Infinity;
        let result = 1;
        for (let i = 2; i <= n; i++) {
            result *= i;
        }
        return result;
    }
    
    // === ВЫЧИСЛЕНИЕ ===
    function calculate() {
        try {
            let fullExpression = expression + currentInput;
            
            // Замена символов для вычисления
            fullExpression = fullExpression
                .replace(/\^/g, '**')
                .replace(/×/g, '*')
                .replace(/÷/g, '/')
                .replace(/−/g, '-');
            
            // Вычисление
            let result = eval(fullExpression);
            
            if (isNaN(result) || !isFinite(result)) {
                showToast('Ошибка вычисления', 'error');
                return;
            }
            
            // Округление
            result = Math.round(result * 1e10) / 1e10;
            
            // Добавление в историю
            addToHistory(fullExpression, result);
            
            currentInput = result.toString();
            expression = '';
            resultDisplayed = true;
            updateDisplay();
            
        } catch (e) {
            showToast('Ошибка выражения', 'error');
        }
    }
    
    // === ОЧИСТКА ===
    function clearAll() {
        currentInput = '0';
        expression = '';
        resultDisplayed = false;
        updateDisplay();
    }
    
    // === УДАЛЕНИЕ ПОСЛЕДНЕГО ===
    function deleteLast() {
        if (resultDisplayed) {
            clearAll();
            return;
        }
        if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
        } else {
            currentInput = '0';
        }
        updateDisplay();
    }
    
    // === ПАМЯТЬ ===
    function memoryClear() {
        memory = 0;
        updateMemoryIndicator();
        showToast('Память очищена', 'success');
    }
    
    function memoryRecall() {
        currentInput = memory.toString();
        resultDisplayed = true;
        updateDisplay();
        showToast('Значение из памяти', 'success');
    }
    
    function memoryAdd() {
        memory += parseFloat(currentInput);
        updateMemoryIndicator();
        showToast('Добавлено в память', 'success');
    }
    
    function memorySubtract() {
        memory -= parseFloat(currentInput);
        updateMemoryIndicator();
        showToast('Вычтено из памяти', 'success');
    }
    
    function updateMemoryIndicator() {
        if (memory !== 0) {
            memoryIndicatorEl.classList.remove('hidden');
            memoryValueEl.textContent = memory;
        } else {
            memoryIndicatorEl.classList.add('hidden');
        }
    }
    
    // === ИСТОРИЯ ===
    function addToHistory(expr, result) {
        history.unshift({
            expression: expr,
            result: result,
            timestamp: Date.now()
        });
        
        // Храним последние 50 записей
        if (history.length > 50) {
            history.pop();
        }
        
        localStorage.setItem('calcHistory', JSON.stringify(history));
        renderHistory();
    }
    
    function renderHistory() {
        if (history.length === 0) {
            historyListEl.innerHTML = `
                <div class="history-empty">
                    <i class="fas fa-clock"></i>
                    <p>История пуста</p>
                </div>
            `;
            return;
        }
        
        historyListEl.innerHTML = history.map((item, index) => `
            <div class="history-item" data-index="${index}">
                <div class="history-expression">${item.expression}</div>
                <div class="history-result">= ${formatNumber(item.result)}</div>
            </div>
        `).join('');
        
        // Клик по истории
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = item.dataset.index;
                currentInput = history[index].result.toString();
                expression = '';
                resultDisplayed = true;
                updateDisplay();
                
                // Закрыть историю на мобильных
                if (window.innerWidth <= 900) {
                    historyPanel.classList.remove('active');
                }
            });
        });
    }
    
    function clearHistory() {
        history = [];
        localStorage.removeItem('calcHistory');
        renderHistory();
        showToast('История очищена', 'success');
    }
    
    function exportHistory() {
        if (history.length === 0) {
            showToast('История пуста', 'error');
            return;
        }
        
        let exportText = '=== История калькулятора ===\n\n';
        history.forEach(item => {
            exportText += `${item.expression} = ${item.result}\n`;
        });
        
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calculator-history-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        
        showToast('История экспортирована', 'success');
    }
    
    // === ДРОБИ ===
    function openFractionModal() {
        fractionModal.classList.add('active');
        fracNumerator.value = 1;
        fracDenominator.value = 2;
        fracNumerator.focus();
    }
    
    function closeFractionModal() {
        fractionModal.classList.remove('active');
    }
    
    function insertFraction() {
        const num = parseInt(fracNumerator.value) || 1;
        const den = parseInt(fracDenominator.value) || 1;
        
        if (den === 0) {
            showToast('Знаменатель не может быть 0', 'error');
            return;
        }
        
        currentInput = (num / den).toString();
        resultDisplayed = true;
        updateDisplay();
        closeFractionModal();
    }
    
    // === РЕЖИМЫ ===
    document.getElementById('degMode').addEventListener('click', () => {
        isDegreeMode = true;
        updateModeButtons();
    });
    
    document.getElementById('radMode').addEventListener('click', () => {
        isDegreeMode = false;
        updateModeButtons();
    });
    
    document.getElementById('fracMode').addEventListener('click', () => {
        isFractionMode = !isFractionMode;
        document.getElementById('fracMode').classList.toggle('active', isFractionMode);
        showToast(isFractionMode ? 'Режим дробей включён' : 'Режим дробей выключен');
    });
    
    function updateModeButtons() {
        document.getElementById('degMode').classList.toggle('active', isDegreeMode);
        document.getElementById('radMode').classList.toggle('active', !isDegreeMode);
        displayModeEl.textContent = isDegreeMode ? 'DEG' : 'RAD';
    }
    
    // === МОБИЛЬНАЯ ИСТОРИЯ ===
    document.getElementById('toggleHistory').addEventListener('click', () => {
        historyPanel.classList.toggle('active');
    });
    
    document.getElementById('clearHistory').addEventListener('click', clearHistory);
    document.getElementById('exportHistory').addEventListener('click', exportHistory);
    document.getElementById('fracCancel').addEventListener('click', closeFractionModal);
    document.getElementById('fracConfirm').addEventListener('click', insertFraction);
    
    // Закрытие модального окна по клику вне
    fractionModal.addEventListener('click', (e) => {
        if (e.target === fractionModal) {
            closeFractionModal();
        }
    });
    
    // === ОБНОВЛЕНИЕ ДИСПЛЕЯ ===
    function updateDisplay() {
        expressionEl.textContent = expression;
        resultEl.textContent = formatNumber(currentInput);
    }
    
    function formatNumber(num) {
        const value = parseFloat(num);
        if (isNaN(value)) return num;
        
        // Форматирование больших чисел
        if (Math.abs(value) >= 1e12) {
            return value.toExponential(6);
        }
        
        // Убираем лишние нули после точки
        return value.toString();
    }
    
    // === УВЕДОМЛЕНИЯ ===
    function showToast(message, type = 'info') {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
    
    // === КЛАВИАТУРА ===
    document.addEventListener('keydown', (e) => {
        const key = e.key;
        
        // Цифры
        if (/^[0-9]$/.test(key)) {
            inputNumber(key);
        }
        
        // Операторы
        if (key === '+') inputOperator('+');
        if (key === '-') inputOperator('-');
        if (key === '*') inputOperator('*');
        if (key === '/') inputOperator('/');
        
        // Точка
        if (key === '.' || key === ',') inputDot();
        
        // Enter = равно
        if (key === 'Enter' || key === '=') {
            e.preventDefault();
            calculate();
        }
        
        // Backspace = удалить
        if (key === 'Backspace') deleteLast();
        
        // Escape = очистить
        if (key === 'Escape') clearAll();
        
        // Скобки
        if (key === '(' || key === ')') inputParenthesis();
    });
    
    // === ПРИВЕТСТВИЕ В КОНСОЛИ ===
    console.log('%c🧮 Инженерный Калькулятор Pro', 'font-size: 20px; color: #58a6ff; font-weight: bold;');
    console.log('%cПоддерживает: тригонометрию, логарифмы, факториалы, память, историю', 'font-size: 12px; color: #8b949e;');
    
});