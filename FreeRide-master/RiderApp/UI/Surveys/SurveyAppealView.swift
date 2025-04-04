//
//  SurveyAppealView.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 25/03/2024.
//  Copyright © 2024 Circuit. All rights reserved.
//

import UIKit

class SurveyAppealView: CardView {

    var survey: Survey!
    private var rideId: String?
    private weak var presenter: UIViewController?

    @IBOutlet weak var backgroundView: UIView!
    @IBOutlet weak var titleLabel: Label!
    @IBOutlet weak var answerButton: Button!

    override func awakeFromNib() {
        super.awakeFromNib()
        backgroundColor = .clear

        backgroundView.cornerRadius = 16
        backgroundView.backgroundColor = Theme.Colors.white

        titleLabel.style = .subtitle1darkgray
        titleLabel.numberOfLines = 0

        answerButton.style = .secondary
        answerButton.setTitle("Answer".localize(), for: .normal)
    }

    func configure(survey: Survey, presenter: UIViewController?) {
        self.survey = survey
        self.presenter = presenter
        titleLabel.text = survey.title
    }

    func configure(rideId: String?) {
        self.rideId = rideId
    }

    @IBAction func answerButtonTapped(_ sender: Any) {
        guard let rideId else {
            return
        }
        let vc = OptionsViewController()
        vc.delegate = self
        vc.configure(
            with: survey.title,
            tracker: .ga4,
            trackerEventKey: survey.trackingEventName,
            rideId: rideId,
            options: survey.localizedQuestions
        )
        vc.isModalInPresentation = true
        presenter?.present(vc, animated: true)
    }

}

extension SurveyAppealView: OptionsViewDelegate {

    func didSelectOptionValue(vc: OptionsViewController, value: String) {
    }

    func didSelectOptionIndex(vc: OptionsViewController, indexPath: IndexPath) {
        guard let answer = survey.questions[safe: indexPath.row] else {
            return
        }

        if answer.lowercased() == "other" {
            // "Other" option
            let alert = UIAlertController(title: "Survey".localize(), message: survey.title, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Submit".localize(), style: .default, handler: { [weak weakAlert = alert, weak self] _ in
                let customAnswer = weakAlert?.textFields?.first?.text?.trim() ?? ""
                vc.sendDataToEventTracker(option: "Other: \(customAnswer)")
                self?.survey.markHasAnswered()
                self?.removeFromSuperview()
            }))
            alert.addTextField()
            presenter?.present(alert, animated: true)
        }
        else {
            vc.sendDataToEventTracker(option: answer)
            survey.markHasAnswered()
            presenter?.dismiss(animated: true)
            removeFromSuperview()
        }
    }

    func didNotSelectOption() {
    }

}
