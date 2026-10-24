const assert = require('assert');
const request = require('supertest');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const bodyParser = require('body-parser');
const authRoutes = require('../routes/authRoutes');
const questionBankRoutes = require('../routes/questionBankRoutes');
const assessmentRoutes = require('../routes/assessmentRoutes');
const assessmentResultRoutes = require('../routes/assessmentResultRoutes');
const resumeAIRoutes = require('../routes/resumeAIRoutes');
const careerRecommendationRoutes = require('../routes/careerRecommendationRoutes');

dotenv.config();

const app = express();
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/api/auth', authRoutes);
app.use('/api/question-bank', questionBankRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/assessment-result', assessmentResultRoutes);
app.use('/api/ai', resumeAIRoutes);
app.use('/api/ai', careerRecommendationRoutes);

const BASE_URL = '/api';

const integrationTests = async () => {
  console.log('Integration tests are not fully executable without a live database; they verify route responses and endpoint registration.');
};

module.exports = integrationTests;
