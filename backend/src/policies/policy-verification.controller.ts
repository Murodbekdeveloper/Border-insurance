import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PoliciesService } from './policies.service';
import { PolicyStatus } from './entities/insurance-policy.entity';

@ApiTags('policy-verification')
@Controller('policies/verify')
export class PolicyVerificationController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get(':policyNumber')
  // Unauthenticated + a small (~900k/year) policyNumber keyspace would
  // otherwise let someone enumerate valid policy/plate-number pairs at the
  // global default rate — cut it down further here.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Polis raqami orqali (autentifikatsiyasiz) uning haqiqiyligini tekshirish',
  })
  async verify(@Param('policyNumber') policyNumber: string) {
    const policy = await this.policiesService.findByPolicyNumber(policyNumber);
    if (!policy) {
      throw new NotFoundException('Bunday raqamli polis topilmadi');
    }

    const valid =
      policy.status === PolicyStatus.PAID &&
      !!policy.validTo &&
      new Date(policy.validTo) >= new Date();

    return {
      policyNumber: policy.policyNumber,
      valid,
      status: policy.status,
      validFrom: policy.validFrom,
      validTo: policy.validTo,
      plateNumber: policy.vehicle?.plateNumber ?? null,
    };
  }
}
