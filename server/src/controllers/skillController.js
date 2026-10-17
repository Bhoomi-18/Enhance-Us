import * as skillService from '../services/skillService.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getSkills = async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const skills = await skillService.getAllSkills(search, category);
    return ApiResponse.success(res, 'Skills retrieved successfully', { skills });
  } catch (error) {
    next(error);
  }
};

export const createSkill = async (req, res, next) => {
  try {
    const skill = await skillService.createSkill(req.body);
    return ApiResponse.success(res, 'Skill created successfully', { skill }, 201);
  } catch (error) {
    next(error);
  }
};
