import React, { useState } from 'react';
import { Star, MessageSquarePlus, CheckCircle2, AlertTriangle, Send, ExternalLink } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { submitFeedback, GOOGLE_FEEDBACK_FORM_URL } from '../../services/feedbackService';

const RATING_LABELS = {
  1: 'Needs Improvement',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export const FeedbackModal = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [improvements, setImprovements] = useState('');
  const [newFeatures, setNewFeatures] = useState('');
  const [comments, setComments] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const resetForm = () => {
    setRating(5);
    setHoverRating(0);
    setImprovements('');
    setNewFeatures('');
    setComments('');
    setErrorMessage(null);
    setIsSuccess(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!rating || rating < 1 || rating > 5) {
      setErrorMessage('Please select a rating between 1 and 5 stars.');
      return;
    }

    if (improvements.length > 1000 || newFeatures.length > 1000 || comments.length > 1000) {
      setErrorMessage('Feedback text fields cannot exceed 1000 characters.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await submitFeedback({
        rating,
        improvements: improvements.trim(),
        newFeatures: newFeatures.trim(),
        comments: comments.trim(),
      });

      // Verification of backend confirmation
      if (response?.success || response?.data?.delivered) {
        setIsSuccess(true);
      } else {
        throw new Error(response?.message || 'Feedback could not be confirmed by the server.');
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
        err.message ||
        'Failed to submit feedback. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="EnhanceUs Platform Feedback"
      description="Help us shape the future of goal-driven peer skill exchange."
      className="max-w-xl"
    >
      {isSuccess ? (
        <div className="py-8 px-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            {/* Exact required success message */}
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              Feedback submitted. Thank you!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Your insights have been securely delivered. We review every recommendation to continuously refine EnhanceUs.
            </p>
          </div>
          <div className="pt-4">
            <Button size="sm" onClick={handleClose} className="px-6">
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}
          {/* Alternative Google Forms Option Banner */}
          <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <ExternalLink className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
              <span className="font-medium">Prefer Google Forms? You can submit directly in a new tab.</span>
            </div>
            <a
              href={GOOGLE_FEEDBACK_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-800 hover:bg-teal-100/60 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-700 transition-colors shadow-subtle focus:outline-none focus:ring-2 focus:ring-teal-500 whitespace-nowrap self-start sm:self-auto"
            >
              <span>Open Google Feedback Form</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Question 1: Rating */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              1. How was your experience with EnhanceUs? <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1" role="radiogroup" aria-label="Experience rating 1 to 5 stars">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const activeStar = (hoverRating || rating) >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      role="radio"
                      aria-checked={rating === starValue}
                      aria-label={`${starValue} star - ${RATING_LABELS[starValue]}`}
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 rounded-lg text-slate-300 dark:text-slate-600 hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          activeStar
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 ml-2">
                {RATING_LABELS[hoverRating || rating]}
              </span>
            </div>
          </div>

          {/* Question 2: Changes or Improvements */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="feedback-improvements" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                2. What changes or improvements should we make?
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {improvements.length} / 1000
              </span>
            </div>
            <textarea
              id="feedback-improvements"
              rows={3}
              value={improvements}
              onChange={(e) => setImprovements(e.target.value.slice(0, 1000))}
              placeholder="Tell us what could be smoother, easier to understand, or more intuitive..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            />
          </div>

          {/* Question 3: New Features */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="feedback-new-features" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                3. What new features would you like us to add?
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {newFeatures.length} / 1000
              </span>
            </div>
            <textarea
              id="feedback-new-features"
              rows={3}
              value={newFeatures}
              onChange={(e) => setNewFeatures(e.target.value.slice(0, 1000))}
              placeholder="Share ideas for features that would accelerate your goal accomplishments..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            />
          </div>

          {/* Question 4: Additional Comments */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="feedback-comments" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                4. Additional comments
              </label>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {comments.length} / 1000
              </span>
            </div>
            <textarea
              id="feedback-comments"
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value.slice(0, 1000))}
              placeholder="Any other thoughts, questions, or shout-outs..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <a
              href={GOOGLE_FEEDBACK_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 transition-colors py-1 focus:outline-none focus:underline"
            >
              <span>Open Google Feedback Form</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmitting}
                rightIcon={Send}
                className="px-5"
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default FeedbackModal;
